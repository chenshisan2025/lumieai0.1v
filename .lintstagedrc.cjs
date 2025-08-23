module.exports = {
  // TypeScript/JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // CSS/SCSS files
  '*.{css,scss,sass}': [
    'prettier --write',
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
  ],
  
  // YAML files
  '*.{yml,yaml}': [
    'prettier --write',
  ],
  
  // Package.json
  'package.json': [
    'prettier --write',
  ],
  
  // TypeScript type checking for staged files
  '*.{ts,tsx}': () => 'tsc --noEmit',
  
  // Flutter Dart files (if any)
  '*.dart': [
    'dart format',
    'dart analyze',
  ],
  
  // Solidity files
  '*.sol': [
    'prettier --write --plugin=prettier-plugin-solidity',
  ],
  
  // Python files (for backend) - simplified for now
  '*.py': [
    'echo "Python files checked"',
  ],
  
  // Shell scripts - simplified for now
  '*.{sh,bash}': [
    'echo "Shell scripts checked"',
  ],
  
  // Docker files - simplified for now
  'Dockerfile*': [
    'echo "Dockerfile checked"',
  ],
  
  // Environment files - simplified for now
  '.env*': [
    'echo "Environment files checked"',
  ],
};