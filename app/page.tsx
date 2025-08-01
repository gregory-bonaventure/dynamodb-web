'use client';

import { useState, useEffect } from 'react';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

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

  return (
    <div className="container mx-auto p-6">
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
                        className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50"
                      >
                        <div className="flex flex-col">
                          <span className="mb-1">{key}</span>
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
                            className="px-2 py-2 whitespace-nowrap text-gray-700 max-w-xs overflow-hidden text-ellipsis"
                            title={displayValue}
                          >
                            {truncatedValue}
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
