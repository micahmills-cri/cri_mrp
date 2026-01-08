/**
 * Script to replace console.* statements with structured logger
 * Run with: npx tsx scripts/replace-console-logs.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

const patterns = {
  error: /console\.error\((.*?)\)/g,
  warn: /console\.warn\((.*?)\)/g,
  info: /console\.info\((.*?)\)/g,
  log: /console\.log\((.*?)\)/g,
  debug: /console\.debug\((.*?)\)/g,
}

const importStatement = "import { logger } from '@/lib/logger'"

async function replaceInFile(filePath: string): Promise<boolean> {
  let content = readFileSync(filePath, 'utf-8')
  const original = content
  let modified = false

  // Check if file already imports logger
  const hasLoggerImport = content.includes("from '@/lib/logger'")

  // Replace console statements
  for (const [method, pattern] of Object.entries(patterns)) {
    if (pattern.test(content)) {
      content = content.replace(pattern, `logger.${method}($1)`)
      modified = true
    }
  }

  // Add import if we made replacements and it doesn't exist
  if (modified && !hasLoggerImport) {
    // Find the last import statement
    const lines = content.split('\n')
    let lastImportIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import .* from/)) {
        lastImportIndex = i
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement)
      content = lines.join('\n')
    } else {
      // No imports found, add at the top
      content = importStatement + '\n\n' + content
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ Updated: ${filePath}`)
    return true
  }

  return false
}

async function main() {
  const filesToProcess = [
    // API routes
    'src/app/api/**/*.ts',
    // Components
    'src/components/**/*.{ts,tsx}',
    // Pages (excluding test files)
    'src/app/**/page.tsx',
    // Server utilities
    'src/server/**/*.ts',
    // Lib utilities (excluding logger itself and tests)
    'src/lib/**/!(logger|*.test).ts',
  ]

  const excludePatterns = [
    '**/node_modules/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/logger.ts',
  ]

  console.log('🔍 Finding files to process...')

  let totalFiles = 0
  let updatedFiles = 0

  for (const pattern of filesToProcess) {
    const files = await glob(pattern, { ignore: excludePatterns })

    for (const file of files) {
      totalFiles++
      const wasUpdated = await replaceInFile(file)
      if (wasUpdated) {
        updatedFiles++
      }
    }
  }

  console.log(`\n✨ Done! Updated ${updatedFiles}/${totalFiles} files`)
}

main().catch((error) => {
  console.error('Script failed:', error)
  process.exit(1)
})
