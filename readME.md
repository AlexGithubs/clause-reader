# Clause Reader

Clause Reader is a SaaS application for AI-powered contract review and analysis. It uses Next.js, TypeScript, and OpenAI to provide intelligent insights into legal documents.

## 🚀 Features

- **PDF Upload**: Drag-and-drop file uploading with validation and preview
- **AI Analysis**: Extract clauses and analyze their implications using OpenAI
- **Clause Highlighting**: Visually identify clauses directly in the PDF with inline highlighting
- **Summary Dashboard**: Get both simple summaries and deep analysis of contracts
- **Search & Filter**: Find specific clauses by text, tag, or classification
- **User Authentication**: Secure login/signup with role-based access control
- **Admin Dashboard**: Manage users and view application analytics

## 📋 Tech Stack

- **Frontend**: Next.js with TypeScript and CSS Modules
- **Backend**: Next.js API Routes (compatible with Netlify Functions)
- **Authentication**: Netlify Identity for email/password authentication
- **Deployment**: Netlify for hosting and serverless functions
- **AI Integration**: OpenAI API for clause extraction and analysis
- **PDF Processing**: PDF.js for rendering and text extraction
- **Analytics**: Google Analytics 4 and Hotjar

## 🛠️ Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- Netlify account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/clause-reader.git
   cd clause-reader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_GA4_ID=G-HYRGKRB79Z
   NEXT_PUBLIC_HOTJAR_ID=your_hotjar_id
   NEXT_PUBLIC_HOTJAR_SV=your_hotjar_sv
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:8888](http://localhost:8888) in your browser.

## 🏗️ Development Workflow

### Folder Structure

```
/components/         # React components
  /auth/             # Authentication components
  /layout/           # Layout components
  /pdf/              # PDF handling components
  /dashboard/        # Dashboard components
  /ui/               # Reusable UI components
/lib/                # Utility functions and helpers
/netlify/functions/  # Serverless functions
/pages/              # Next.js pages
/styles/             # CSS modules
/public/             # Static assets
```

### Running Locally

The project uses `netlify dev` to run locally, which handles both the Next.js application and Netlify Functions:

```bash
npm run dev
```

This will start the development server with Netlify Functions support at http://localhost:8888.

### Environment Variables

- **Local Development**: Use `.env.local` file
- **Netlify Deployment**: Configure in the Netlify Dashboard under Site settings > Build & deploy > Environment

## 📤 Deployment

### Preview Deployment

To create a preview deployment:

```bash
npm run deploy
```

This will deploy to a preview URL that you can share.

### Production Deployment

For production deployment:

1. Push to your main branch (if you have CI/CD set up with Netlify)
   
   OR

2. Run:
   ```bash
   npm run deploy -- --prod
   ```

### Netlify Configuration

The project includes a `netlify.toml` file that configures:
- Build settings
- Deployment directories
- Netlify Functions location
- Redirects for client-side routing
- Role-based access control

## 🔒 Authentication

The application uses Netlify Identity for authentication with two user roles:
- **Admin**: Can access the admin dashboard and manage users
- **Standard**: Regular users who can upload and analyze contracts

When a user signs up, they are assigned the `standard` role by default.

## 📊 Analytics Integration

### Google Analytics 4

GA4 is integrated in `_document.tsx` and tracks:
- Page views
- Contract uploads
- Clause analysis
- User interactions

The GA4 ID is set with the `NEXT_PUBLIC_GA4_ID` environment variable.

### Hotjar

Hotjar integration is prepared but commented out in `_document.tsx`. To enable:

1. Get your Hotjar ID and Hotjar Script Version
2. Set the environment variables:
   ```
   NEXT_PUBLIC_HOTJAR_ID=your_hotjar_id
   NEXT_PUBLIC_HOTJAR_SV=your_hotjar_sv
   ```
3. Uncomment the Hotjar script in `_document.tsx`

## 🤖 OpenAI Integration

The application uses OpenAI for:
1. Extracting clauses from PDF text
2. Analyzing and tagging clauses
3. Generating simple summaries
4. Creating deep analysis with recommendations

The OpenAI integration is implemented in:
- `lib/openai.ts`: Utility functions for OpenAI API calls
- `netlify/functions/extract.ts`: PDF text extraction and clause detection
- `netlify/functions/summarize-simple.ts`: Simple contract summary generation
- `netlify/functions/summarize-deep.ts`: Detailed analysis with recommendations

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact

For questions or support, please reach out to [your-email@example.com](mailto:your-email@example.com).