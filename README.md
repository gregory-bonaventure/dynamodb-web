# DynamoDash

A modern, responsive web interface for interacting with Amazon DynamoDB. This application allows you to browse tables, view items, and manage your DynamoDash resources with ease.

![DynamoDash Screenshot](https://via.placeholder.com/800x500.png?text=DynamoDash+Screenshot)

## ✨ Features

- 🔍 Browse and search DynamoDash tables
- 📝 View and explore table items with pagination
- 🔄 Auto-refresh for real-time data
- 🎨 Clean, responsive UI with dark/light mode support
- 📋 Copy JSON content with a single click
- 🔄 Support for compressed data (gzip, zlib, deflate)
- 🔒 Secure AWS credentials management

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn
- AWS credentials with DynamoDB access

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dynamodb-web-ui.git
   cd dynamodb-web-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

1. Enter your AWS credentials in the configuration panel:
   - AWS Region
   - Access Key ID
   - Secret Access Key

2. Click "Save Configuration" to persist your settings in the browser's local storage.

## 🛠️ Built With

- [Next.js](https://nextjs.org/) - React framework
- [AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/) - AWS services integration
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Pako](https://github.com/nodeca/pako) - Data compression
- [Recharts](https://recharts.org/) - Data visualization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [AWS DynamoDB](https://aws.amazon.com/dynamodb/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
