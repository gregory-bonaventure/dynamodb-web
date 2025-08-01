'use client';

import { useState, useEffect, useCallback } from 'react';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as pako from 'pako';

// Fonction pour charger la configuration depuis le localStorage
const loadConfigFromStorage = () => {
  // Vérifie si on est côté client (navigateur)
  if (typeof window === 'undefined') {
    return {
      region: 'us-east-1',
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
      },
    };
  }

  try {
    const savedConfig = localStorage.getItem('awsConfig');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
  } catch (e) {
    console.error('Erreur lors du chargement de la configuration AWS:', e);
  }

  // Retourne une configuration par défaut si rien n'est sauvegardé
  return {
    region: 'us-east-1',
    credentials: {
      accessKeyId: '',
      secretAccessKey: '',
    },
  };
};

// Liste des régions AWS disponibles
const awsRegions = [
  { code: 'us-east-1', name: 'US East (N. Virginia)' },
  { code: 'us-east-2', name: 'US East (Ohio)' },
  { code: 'us-west-1', name: 'US West (N. California)' },
  { code: 'us-west-2', name: 'US West (Oregon)' },
  { code: 'af-south-1', name: 'Africa (Cape Town)' },
  { code: 'ap-east-1', name: 'Asia Pacific (Hong Kong)' },
  { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
  { code: 'ap-northeast-3', name: 'Asia Pacific (Osaka)' },
  { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)' },
  { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
  { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
  { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
  { code: 'ca-central-1', name: 'Canada (Central)' },
  { code: 'eu-central-1', name: 'Europe (Frankfurt)' },
  { code: 'eu-west-1', name: 'Europe (Ireland)' },
  { code: 'eu-west-2', name: 'Europe (London)' },
  { code: 'eu-south-1', name: 'Europe (Milan)' },
  { code: 'eu-west-3', name: 'Europe (Paris)' },
  { code: 'eu-north-1', name: 'Europe (Stockholm)' },
  { code: 'me-south-1', name: 'Middle East (Bahrain)' },
  { code: 'sa-east-1', name: 'South America (São Paulo)' },
];

export default function DynamoDBViewer() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogContent, setDialogContent] = useState<{title: string; content: string}>({title: '', content: ''});
  const [isDecompressing, setIsDecompressing] = useState<boolean>(false);
  const [decompressionError, setDecompressionError] = useState<string | null>(null);
  const [config, setConfig] = useState(loadConfigFromStorage);

  // Sauvegarder la configuration dans le localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem('awsConfig', JSON.stringify(config));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde de la configuration AWS:', e);
    }
  }, [config]);

  // Get DynamoDB client with current config
  const getDynamoDBClient = () => {
    try {
      if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
        throw new Error('AWS credentials are required');
      }
      
      return new DynamoDBClient({
        region: config.region,
        credentials: {
          accessKeyId: config.credentials.accessKeyId,
          secretAccessKey: config.credentials.secretAccessKey
        }
      });
    } catch (err) {
      console.error('Error creating DynamoDB client:', err);
      throw new Error('Failed to initialize AWS client. Please check your credentials.');
    }
  };

  // Fetch tables
  const fetchTables = async () => {
    if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
      setError('Please provide both Access Key ID and Secret Access Key');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create a new client with current config
      const client = getDynamoDBClient();
      const command = new ListTablesCommand({});
      const response = await client.send(command);
      
      setTables(response.TableNames || []);
      
      // Reset table selection
      setSelectedTable('');
      setAllItems([]);
      setFilteredItems([]);
      setAvailableColumns([]);
    } catch (err) {
      setError(`Error fetching tables: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch items from selected table
  const fetchTableItems = async (tableName: string) => {
    if (!tableName) return;
    
    if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
      setError('Please provide both Access Key ID and Secret Access Key');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Create a new client with current config
      const client = getDynamoDBClient();
      const docClient = DynamoDBDocumentClient.from(client);
      
      const command = new ScanCommand({
        TableName: tableName,
        Limit: 50, // Limit to 50 items for performance
      });
      
      const response = await docClient.send(command);
      const items = response.Items || [];
      setAllItems(items);
      setFilteredItems(items);
      
      // Extract available columns from the first item
      if (items.length > 0) {
        const columns = Object.keys(items[0]);
        setAvailableColumns(columns);
        
        // Initialize empty filters for each column
        const filters: Record<string, string> = {};
        columns.forEach(col => {
          filters[col] = '';
        });
        setColumnFilters(filters);
      } else {
        setAvailableColumns([]);
        setColumnFilters({});
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error fetching items: ${errorMessage}`);
      console.error('Error fetching items:', err);
      setAllItems([]);
      setFilteredItems([]);
      setAvailableColumns([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters whenever search term, column filters, or items change
  useEffect(() => {
    if (!allItems.length) return;

    const filtered = allItems.filter(item => {
      // Apply global search
      if (searchTerm) {
        const matchesSearch = Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!matchesSearch) return false;
      }

      // Apply column filters
      return Object.entries(columnFilters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        const cellValue = String(item[column] || '').toLowerCase();
        return cellValue.includes(filterValue.toLowerCase());
      });
    });

    setFilteredItems(filtered);
  }, [searchTerm, columnFilters, allItems]);

  // Load tables on component mount
  useEffect(() => {
    fetchTables();
  }, []);

  // Load items when table is selected
  useEffect(() => {
    if (selectedTable) {
      fetchTableItems(selectedTable);
    } else {
      setAllItems([]);
      setFilteredItems([]);
      setAvailableColumns([]);
    }
  }, [selectedTable]);

  // Reset filters when table changes
  useEffect(() => {
    setSearchTerm('');
    setColumnFilters({});
  }, [selectedTable]);

  const handleColumnFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Effacer le cache et réinitialiser la configuration
  const clearCache = () => {
    try {
      localStorage.removeItem('awsConfig');
      setConfig(loadConfigFromStorage()); // Réinitialise avec les valeurs par défaut
      setTables([]);
      setSelectedTable('');
      setAllItems([]);
      setFilteredItems([]);
      setError(null);
    } catch (e) {
      console.error('Erreur lors de la suppression du cache:', e);
    }
  };

  const isCompressed = (data: any): boolean => {
    if (typeof data !== 'string' && !(data instanceof Uint8Array)) {
      return false;
    }
    
    // Check for gzip header (first two bytes: 0x1F 0x8B)
    if (data instanceof Uint8Array && data.length >= 2 && data[0] === 0x1F && data[1] === 0x8B) {
      return true;
    }
    
    // Check for zlib header (first byte: 0x78, second byte: 0x01-0x9C)
    if (data instanceof Uint8Array && data.length >= 2 && data[0] === 0x78 && (data[1] >= 0x01 && data[1] <= 0x9C)) {
      return true;
    }
    
    return false;
  };

  const formatContent = (content: any): {content: string, isJson: boolean} => {
    if (typeof content === 'object') {
      return { content: JSON.stringify(content, null, 2), isJson: true };
    }
    
    // Try to parse as JSON if it's a string
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        return { content: JSON.stringify(parsed, null, 2), isJson: true };
      } catch (e) {
        // Not a JSON string
        return { content: content, isJson: false };
      }
    }
    
    return { content: String(content), isJson: false };
  };

  // Helper function to check if a string is valid JSON
  const isJsonString = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  const decompressData = useCallback(async (data: any): Promise<{content: string, isJson: boolean}> => {
    try {
      // If data is not compressed, just format it
      if (!isCompressed(data)) {
        return formatContent(data);
      }

      let uint8Array: Uint8Array;
      
      // Convert string to Uint8Array if needed
      if (typeof data === 'string') {
        try {
          // First, try to handle base64 encoded string
          const binaryString = atob(data);
          uint8Array = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }
        } catch (e) {
          // If atob fails, try to handle it as a raw string
          const encoder = new TextEncoder();
          uint8Array = encoder.encode(data);
        }
      } else if (Array.isArray(data)) {
        // Handle array input (common for binary data from some sources)
        uint8Array = new Uint8Array(data);
      } else if (data instanceof ArrayBuffer) {
        // Handle ArrayBuffer input
        uint8Array = new Uint8Array(data);
      } else if (data.buffer instanceof ArrayBuffer) {
        // Handle TypedArray input (Uint8Array, etc.)
        uint8Array = new Uint8Array(data.buffer);
      } else {
        // For any other type, try to convert to string and encode
        const encoder = new TextEncoder();
        uint8Array = encoder.encode(String(data));
      }

      // Try different decompression methods with specific error handling
      let decompressed: string;
      let lastError: Error | null = null;
      
      try {
        // Try gzip decompression first
        try {
          const result = pako.ungzip(uint8Array, { to: 'string' });
          return { content: result, isJson: isJsonString(result) };
        } catch (gzipError) {
          // If gzip fails, try zlib (inflate)
          try {
            const result = pako.inflate(uint8Array, { to: 'string' });
            return { content: result, isJson: isJsonString(result) };
          } catch (zlibError) {
            // If zlib fails, try raw deflate
            try {
              const result = pako.inflateRaw(uint8Array, { to: 'string' });
              return { content: result, isJson: isJsonString(result) };
            } catch (rawError) {
              // If all decompression methods fail, return the data as is
              console.warn('Failed to decompress data. It may be in an unsupported format.', {
                gzipError,
                zlibError,
                rawError,
                inputType: typeof data,
                inputLength: data?.length
              });
              return { content: data, isJson: false };
            }
          }
        }
      } catch (error) {
        console.error('Error during decompression:', error);
        return { content: data, isJson: false };
      }
      
      // Try to return the raw data as a string as a last resort
      try {
        const decoder = new TextDecoder('utf-8');
        const rawContent = decoder.decode(uint8Array);
        return { 
          content: `[Failed to decompress data. Raw content (${uint8Array.length} bytes)]: ${rawContent}`, 
          isJson: false 
        };
      } catch (e) {
        throw new Error(`Failed to decompress data. All methods attempted. Last error: ${lastError?.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Decompression error:', error);
      // Include more detailed error information
      const errorMessage = error instanceof Error ? error.message : String(error);
      const dataInfo = typeof data === 'string' 
        ? ` (${data.length} chars, starts with: ${data.substring(0, 50)}...)` 
        : ` (type: ${typeof data}, length: ${data?.length || 'unknown'})`;
      
      throw new Error(`Failed to process data${dataInfo}. Error: ${errorMessage}`);
    }
  }, []);

  const openDialog = async (title: string, content: any) => {
    try {
      setDecompressionError(null);
      
      const columnName = title.replace(' - Full Content', '');
      const isCompressedColumn = columnName.toLowerCase().includes('compresseddata');
      
      if (isCompressedColumn) {
        setIsDecompressing(true);
        try {
          const { content: decompressed, isJson } = await decompressData(content);
          setDialogContent({
            title: `${columnName} - Decompressed${isJson ? ' JSON' : ''} Content`,
            content: decompressed
          });
        } catch (error) {
          setDecompressionError(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Fall back to showing compressed data if decompression fails
          const { content: formattedContent, isJson } = formatContent(content);
          setDialogContent({
            title: `${columnName} - Compressed${isJson ? ' JSON' : ''} Content`,
            content: formattedContent
          });
        } finally {
          setIsDecompressing(false);
        }
      } else {
        const { content: formattedContent, isJson } = formatContent(content);
        setDialogContent({
          title: isJson ? `${columnName} - JSON Content` : title,
          content: formattedContent
        });
      }
      
      setDialogOpen(true);
    } catch (error) {
      console.error('Error opening dialog:', error);
      setError('Failed to display content. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-6 relative">
      {/* Dialog for displaying full content */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{dialogContent.title}</h3>
              <button 
                onClick={() => setDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-auto flex-grow">
              {isDecompressing ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Decompressing data...</span>
                </div>
              ) : (
                <>
                  {decompressionError && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                      <p className="font-bold">Decompression Warning</p>
                      <p>{decompressionError}</p>
                      <p className="mt-2 text-sm">Showing compressed data instead.</p>
                    </div>
                  )}
                  <div className="relative">
                    <pre className={`whitespace-pre-wrap break-words text-sm bg-gray-50 p-4 rounded overflow-auto max-h-[60vh] font-mono ${
                      dialogContent.title.includes('JSON') ? 'language-json' : ''
                    }`}>
                      {dialogContent.title.includes('JSON') ? (
                        <code dangerouslySetInnerHTML={{
                          __html: dialogContent.content
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"(\w+)":/g, '"<span class="text-purple-600 font-semibold">$1</span>":')
                            .replace(/: "(.*?)"/g, ': "<span class="text-green-600">$1</span>"')
                            .replace(/: (true|false|null|\d+)/g, ': <span class="text-blue-600">$1</span>')
                        }} />
                      ) : (
                        <code>{dialogContent.content}</code>
                      )}
                    </pre>
                    {dialogContent.title.includes('JSON') && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dialogContent.content);
                        }}
                        className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                        title="Copy to clipboard"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-6">DynamoDB Table Viewer</h1>
      
      {/* AWS Configuration */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-3">AWS Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">AWS Region</label>
            <select
              value={config.region}
              onChange={(e) => setConfig({ ...config, region: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              suppressHydrationWarning={true}
            >
              {awsRegions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name} ({region.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Key ID</label>
            <input
              type="password"
              value={config.credentials.accessKeyId}
              onChange={(e) => setConfig({
                ...config,
                credentials: { ...config.credentials, accessKeyId: e.target.value }
              })}
              className="w-full p-2 border rounded"
              placeholder="Access Key ID"
              suppressHydrationWarning={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Access Key</label>
            <input
              type="password"
              value={config.credentials.secretAccessKey}
              onChange={(e) => setConfig({
                ...config,
                credentials: { ...config.credentials, secretAccessKey: e.target.value }
              })}
              className="w-full p-2 border rounded"
              placeholder="Secret Access Key"
              suppressHydrationWarning={true}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={fetchTables}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <button
              type="button"
              onClick={clearCache}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              title="Effacer les identifiants enregistrés"
            >
              Effacer le cache
            </button>
          </div>
        </div>
      </div>

      {/* Table Selection and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-3">Select a Table</h2>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          disabled={loading || tables.length === 0}
          suppressHydrationWarning={true}
        >
          <option value="">-- Select a table --</option>
          {tables.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>

        {/* Global Search */}
        {selectedTable && (
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Global Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across all columns..."
              className="w-full p-2 border rounded"
              suppressHydrationWarning={true}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Table Data */}
      {selectedTable && (
        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Table: {selectedTable}</h2>
          {loading ? (
            <p>Loading items...</p>
          ) : filteredItems.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-gray-500">
                {allItems.length === 0 
                  ? 'No items found in this table.' 
                  : 'No items match your search/filters.'}
              </p>
              {allItems.length > 0 && filteredItems.length === 0 && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setColumnFilters({});
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {availableColumns.map((key) => (
                      <th
                        key={key}
                        scope="col"
                        className={`px-2 py-2 text-left font-medium ${key.toLowerCase().includes('compressed data') ? 'bg-yellow-50' : 'bg-gray-50'} text-gray-500 uppercase tracking-wider whitespace-nowrap`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-1">
                            <span className="mb-1">{key}</span>
                            {key.toLowerCase().includes('compressed data') && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" title="This column contains compressed data">
                                Compressed
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder={`Filter ${key}`}
                            value={columnFilters[key] || ''}
                            onChange={(e) => handleColumnFilterChange(key, e.target.value)}
                            className="text-xs p-1 border rounded w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.values(item).map((value: any, i) => {
                        // Truncate long values
                        const displayValue = typeof value === 'object' 
                          ? JSON.stringify(value) 
                          : String(value);
                        const truncatedValue = displayValue.length > 50 
                          ? `${displayValue.substring(0, 47)}...` 
                          : displayValue;
                        
                        return (
                          <td 
                            key={i} 
                            className={`px-2 py-2 whitespace-nowrap ${Object.keys(item)[i].toLowerCase().includes('compresseddata') ? 'bg-yellow-50' : ''} text-gray-700 max-w-xs`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate flex-grow" title={displayValue}>
                                {truncatedValue}
                              </span>
                              {Object.keys(item)[i].toLowerCase().includes('compresseddata') && (
                                <button
                                  onClick={() => openDialog(`${Object.keys(item)[i]} - Full Content`, value)}
                                  className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  title="View full content"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
