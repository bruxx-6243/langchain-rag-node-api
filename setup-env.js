import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env");

if (!existsSync(envPath)) {
  const envContent = `# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Configuration
PORT=3000

# File Storage Configuration
UPLOAD_PATH=./uploads
`;

  writeFileSync(envPath, envContent);
  console.log("✅ Created .env file with template values");
  console.log(
    "⚠️  Please update the .env file with your actual API keys and configuration"
  );
} else {
  console.log("✅ .env file already exists");
}
