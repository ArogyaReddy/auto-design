const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { FileSystemError } = require('./ErrorHandler');
const { getConfig } = require('./Config');

/**
 * File Management System for Auto-Design Framework
 */
class FileManager {
  constructor(config = null) {
    this.config = config || getConfig();
  }

  /**
   * Write generated test files to the filesystem
   * @param {Object} output - Generated code output
   * @param {Object} plan - Test plan
   * @param {string} customOutputDir - Optional custom output directory
   */
  async writeFiles(output, plan, customOutputDir = null) {
    try {
      const safeFeatureName = this._toPascalCase(plan.featureName);
      const baseOutputDir = customOutputDir || 
        path.join(process.cwd(), this.config.get('output.baseDir'), safeFeatureName);

      // Clean existing directory
      if (fs.existsSync(baseOutputDir)) {
        await fs.remove(baseOutputDir);
      }

      // Create directory structure
      const dirs = this._createDirectoryStructure(baseOutputDir);

      // Write files
      await this._writeFilesSafely(output, dirs, safeFeatureName);

      // Open folder if configured
      if (this.config.get('output.openAfterGeneration')) {
        this._openFolder(baseOutputDir);
      }

      return {
        success: true,
        outputDirectory: baseOutputDir,
        filesCreated: this._getCreatedFilesList(dirs, safeFeatureName)
      };

    } catch (error) {
      throw new FileSystemError(`Failed to write test files: ${error.message}`, customOutputDir);
    }
  }

  /**
   * Create directory structure for test files
   * @param {string} baseDir - Base output directory
   * @returns {Object} Directory paths
   */
  _createDirectoryStructure(baseDir) {
    const dirs = {
      Features: path.join(baseDir, 'Features'),
      Steps: path.join(baseDir, 'Steps'),
      Pages: path.join(baseDir, 'Pages'),
      Tests: path.join(baseDir, 'Tests'),
    };

    // Create all directories
    Object.values(dirs).forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
    });

    return dirs;
  }

  /**
   * Write files safely with error handling
   * @param {Object} output - Generated code
   * @param {Object} dirs - Directory paths
   * @param {string} featureName - Safe feature name
   */
  async _writeFilesSafely(output, dirs, featureName) {
    const fileWrites = [
      { path: path.join(dirs.Features, `${featureName}.feature`), content: output.feature },
      { path: path.join(dirs.Pages, `${featureName}.page.js`), content: output.pageObject },
      { path: path.join(dirs.Steps, `${featureName}.steps.js`), content: output.steps },
      { path: path.join(dirs.Tests, `${featureName}.test.js`), content: output.test }
    ];

    const writePromises = fileWrites.map(async ({ path: filePath, content }) => {
      try {
        await fs.writeFile(filePath, content, 'utf8');
        return { path: filePath, success: true };
      } catch (error) {
        throw new FileSystemError(`Failed to write file ${filePath}: ${error.message}`, filePath);
      }
    });

    await Promise.all(writePromises);
  }

  /**
   * Get list of created files
   * @param {Object} dirs - Directory paths
   * @param {string} featureName - Feature name
   * @returns {string[]} List of created file paths
   */
  _getCreatedFilesList(dirs, featureName) {
    return [
      path.join(dirs.Features, `${featureName}.feature`),
      path.join(dirs.Pages, `${featureName}.page.js`),
      path.join(dirs.Steps, `${featureName}.steps.js`),
      path.join(dirs.Tests, `${featureName}.test.js`)
    ];
  }

  /**
   * Open folder in system file manager
   * @param {string} folderPath - Path to open
   */
  _openFolder(folderPath) {
    const commands = {
      darwin: `open "${folderPath}"`,
      win32: `explorer "${folderPath}"`,
      linux: `xdg-open "${folderPath}"`
    };

    const command = commands[process.platform];
    if (command) {
      exec(command, (err) => {
        if (!err) {
          console.log(`🚀 Automatically opening output folder: ${folderPath}`);
        }
      });
    }
  }

  /**
   * Clean up old output directories
   * @param {number} maxAge - Maximum age in days
   */
  async cleanupOldOutputs(maxAge = 7) {
    try {
      const outputDir = path.join(process.cwd(), this.config.get('output.baseDir'));
      if (!fs.existsSync(outputDir)) {
        return;
      }

      const dirs = await fs.readdir(outputDir);
      const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000);

      for (const dir of dirs) {
        const dirPath = path.join(outputDir, dir);
        const stats = await fs.stat(dirPath);
        
        if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
          await fs.remove(dirPath);
          console.log(`Cleaned up old output directory: ${dir}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup old outputs: ${error.message}`);
    }
  }

  /**
   * Check if output directory exists and is writable
   * @param {string} outputDir - Directory to check
   * @returns {boolean} Whether directory is accessible
   */
  async checkOutputDirectory(outputDir = null) {
    try {
      const targetDir = outputDir || path.join(process.cwd(), this.config.get('output.baseDir'));
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        await fs.mkdirs(targetDir);
      }

      // Test write access
      const testFile = path.join(targetDir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.remove(testFile);

      return true;
    } catch (error) {
      throw new FileSystemError(`Output directory is not accessible: ${error.message}`, outputDir);
    }
  }

  /**
   * Convert string to PascalCase
   * @param {string} str - String to convert
   * @returns {string} PascalCase string
   */
  _toPascalCase(str) {
    if (!str) return 'DefaultFeature';
    
    // Check if the string starts with a prefix pattern (3-4 uppercase letters followed by hyphen)
    const prefixMatch = str.match(/^([A-Z]{3,4})-(.+)$/);
    
    if (prefixMatch) {
      // Preserve the prefix and hyphen, convert only the name part
      const prefix = prefixMatch[1];
      const namePart = prefixMatch[2];
      const pascalCaseName = namePart
        .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
        .replace(/^\w/, c => c.toUpperCase());
      return `${prefix}-${pascalCaseName}`;
    }
    
    // Original behavior for strings without prefix
    return str
      .replace(/[^a-zA-Z0-9]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '')
      .replace(/^\w/, c => c.toUpperCase());
  }
}

module.exports = { FileManager };
