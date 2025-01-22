// import fs from 'fs/promises';
// import path from 'path';
// import crypto from 'crypto';
// import DspaceClient from './DspaceClient5.js'; // Assuming the provided class is in DspaceClient.js

// const varianceFile = path.join(process.cwd(), 'variance.json');
// const client = new DspaceClient();

// class Variance {
//     static async initialize() {
//         try {
//             await fs.access(varianceFile);
//         } catch {
//             await fs.writeFile(varianceFile, JSON.stringify({ files: {} }, null, 4));
//         }
//     }

//     static async readVarianceData() {
//         const data = await fs.readFile(varianceFile, 'utf8');
//         return JSON.parse(data);
//     }

//     static async writeVarianceData(data) {
//         await fs.writeFile(varianceFile, JSON.stringify(data, null, 4));
//     }

//     static async monitor(filename) {
//         const absPath = path.resolve(filename);
//         const data = await this.readVarianceData();

//         if (data.files[absPath]) {
//             console.log(`File "${filename}" is already being monitored.`);
//             return;
//         }

//         data.files[absPath] = { versions: [] };
//         await this.writeVarianceData(data);
//         console.log(`File "${filename}" is now being monitored.`);
//     }

//     static async finalize(filename) {
//         const absPath = path.resolve(filename);
//         const data = await this.readVarianceData();

//         if (!data.files[absPath]) {
//             console.log(`File "${filename}" is not being monitored. Use "variance monitor" first.`);
//             return;
//         }

//         const versionHash = crypto.createHash('sha256').update(Date.now().toString()).digest('hex');
//         const virtualPath = `variance/${versionHash}/${path.basename(absPath)}`;
//         const uploadStats = await client.upload(absPath, virtualPath);

//         data.files[absPath].versions.push({
//             versionHash,
//             virtualPath,
//             timestamp: new Date().toISOString(),
//             stats: uploadStats
//         });

//         await this.writeVarianceData(data);
//         console.log(`File "${filename}" finalized with version hash: ${versionHash}`);
//     }

//     static async show(filename) {
//         const absPath = path.resolve(filename);
//         const data = await this.readVarianceData();

//         if (!data.files[absPath]) {
//             console.log(`File "${filename}" is not being monitored.`);
//             return;
//         }

//         console.log(`History for "${filename}":`);
//         data.files[absPath].versions.forEach((version, index) => {
//             console.log(`
// Version ${index + 1}:
// - Version Hash: ${version.versionHash}
// - Virtual Path: ${version.virtualPath}
// - Timestamp: ${version.timestamp}
//             `);
//         });
//     }

//     static async findIdByPath(data, targetPath) {
//         // Normalize the targetPath
//         const normalizedTargetPath = targetPath
//             .replace(/[\\/]/g, '\\\\') // Replace both forward and backward slashes with double-backslashes
//             .replace(/^\\\\|\\\\$/g, ''); // Remove leading/trailing double-backslashes
    
//         for (const item of data) {
//             // Normalize the item's path
//             const normalizedItemPath = item.path
//                 .replace(/[\\/]/g, '\\\\') // Replace both forward and backward slashes with double-backslashes
//                 .replace(/^\\\\|\\\\$/g, ''); // Remove leading/trailing double-backslashes
    
//             console.log("path x: ", normalizedItemPath);
//             console.log("path y: ", normalizedTargetPath);
    
//             if (normalizedItemPath === normalizedTargetPath) {
//                 return item.id;
//             }
    
//             if (item.type === "directory" && item.children) {
//                 const result = await this.findIdByPath(item.children, targetPath);
//                 if (result) {
//                     return result;
//                 }
//             }
//         }
    
//         return null;
//     }
    
    

//     static async restore(versionHash) {
//         const data = await this.readVarianceData();
//         const fileEntry = Object.entries(data.files).find(([_, details]) =>
//             details.versions.some(version => version.versionHash === versionHash)
//         );

//         if (!fileEntry) {
//             console.log(`Version hash "${versionHash}" not found.`);
//             return;
//         }

//         console.log("A")

//         const [filePath, details] = fileEntry;
//         const version = details.versions.find(v => v.versionHash === versionHash);

//         console.log(filePath)
//         console.log(version)

//         let dir = await client.getUserDirectory()

//         // console.log(dir)
//         let id = await this.findIdByPath(dir.children, "root\\"+version.virtualPath)
//         console.log("id : ",id)
//         console.log("virtual path : ",version.virtualPath)
//         const result = await client.retrieve(id);
//         console.log(result)
//         const restoredContent = await fs.readFile(result.path, 'utf8');
//         await fs.writeFile(filePath, restoredContent);

//         console.log(`File "${filePath}" restored to version "${versionHash}".`);
//     }
// }

// // CLI
// (async () => {
//     await Variance.initialize();

//     const [command, arg] = process.argv.slice(2);

//     try {
//         switch (command) {
//             case 'monitor':
//                 await Variance.monitor(arg);
//                 break;
//             case 'finalize':
//                 await Variance.finalize(arg);
//                 break;
//             case 'show':
//                 await Variance.show(arg);
//                 break;
//             case 'restore':
//                 await Variance.restore(arg);
//                 break;
//             default:
//                 console.log(`Unknown command: ${command}`);
//                 console.log(`Available commands: monitor, finalize, show, restore`);
//         }
//     } catch (error) {
//         console.error('An error occurred:', error.message);
//     }
// })();

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import DspaceClient from './DspaceClient5.js';
import { fileURLToPath } from 'url';

class VarianceManager {
    constructor() {
        this.varianceFile = path.join(process.cwd(), 'variance.json');
        this.client = new DspaceClient();
    }

    async initialize() {
        try {
            await fs.access(this.varianceFile);
        } catch {
            await this.writeVarianceData({ files: {} });
        }
    }

    async readVarianceData() {
        try {
            const data = await fs.readFile(this.varianceFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Failed to read variance data: ${error.message}`);
        }
    }

    async writeVarianceData(data) {
        try {
            await fs.writeFile(this.varianceFile, JSON.stringify(data, null, 4));
        } catch (error) {
            throw new Error(`Failed to write variance data: ${error.message}`);
        }
    }

    async monitor(filename) {
        if (!filename) {
            throw new Error('Filename is required');
        }

        const absPath = path.resolve(filename);
        const data = await this.readVarianceData();

        if (data.files[absPath]) {
            throw new Error(`File "${filename}" is already being monitored.`);
        }

        data.files[absPath] = { versions: [] };
        await this.writeVarianceData(data);
        return `File "${filename}" is now being monitored.`;
    }

    async finalize(filename) {
        if (!filename) {
            throw new Error('Filename is required');
        }

        const absPath = path.resolve(filename);
        const data = await this.readVarianceData();

        if (!data.files[absPath]) {
            throw new Error(`File "${filename}" is not being monitored. Use "variance monitor" first.`);
        }

        try {
            const versionHash = this.generateVersionHash();
            const virtualPath = this.createVirtualPath(versionHash, absPath);
            const uploadStats = await this.client.upload(absPath, virtualPath);

            const version = {
                versionHash,
                virtualPath,
                timestamp: new Date().toISOString(),
                stats: uploadStats
            };

            data.files[absPath].versions.push(version);
            await this.writeVarianceData(data);
            return `File "${filename}" finalized with version hash: ${versionHash}`;
        } catch (error) {
            throw new Error(`Failed to finalize file: ${error.message}`);
        }
    }

    async show(filename) {
        if (!filename) {
            throw new Error('Filename is required');
        }

        const absPath = path.resolve(filename);
        const data = await this.readVarianceData();

        if (!data.files[absPath]) {
            throw new Error(`File "${filename}" is not being monitored.`);
        }

        return data.files[absPath].versions.map((version, index) => ({
            versionNumber: index + 1,
            versionHash: version.versionHash,
            virtualPath: version.virtualPath,
            timestamp: version.timestamp
        }));
    }

    async restore(versionHash) {
        if (!versionHash) {
            throw new Error('Version hash is required');
        }

        const data = await this.readVarianceData();
        const fileEntry = this.findFileEntryByVersionHash(data, versionHash);

        if (!fileEntry) {
            throw new Error(`Version hash "${versionHash}" not found.`);
        }

        const [filePath, details] = fileEntry;
        const version = details.versions.find(v => v.versionHash === versionHash);

        try {
            const directory = await this.client.getUserDirectory();
            const id = await this.findIdByPath(directory.children, `root\\${version.virtualPath}`);

            if (!id) {
                throw new Error('File ID not found in directory structure');
            }

            const result = await this.client.retrieve(id);
            const restoredContent = await fs.readFile(result.path, 'utf8');
            await fs.writeFile(filePath, restoredContent);

            return `File "${filePath}" restored to version "${versionHash}".`;
        } catch (error) {
            throw new Error(`Failed to restore file: ${error.message}`);
        }
    }

    // Helper methods
    generateVersionHash() {
        return crypto.createHash('sha256')
            .update(Date.now().toString())
            .digest('hex');
    }

    createVirtualPath(versionHash, filePath) {
        return `variance/${versionHash}/${path.basename(filePath)}`;
    }

    findFileEntryByVersionHash(data, targetHash) {
        return Object.entries(data.files).find(([_, details]) =>
            details.versions.some(version => version.versionHash === targetHash)
        );
    }

    async findIdByPath(data, targetPath) {
        const normalizedTargetPath = this.normalizePath(targetPath);
        
        for (const item of data) {
            const normalizedItemPath = this.normalizePath(item.path);
            
            if (normalizedItemPath === normalizedTargetPath) {
                return item.id;
            }

            if (item.type === "directory" && item.children) {
                const result = await this.findIdByPath(item.children, targetPath);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    normalizePath(pathString) {
        return pathString
            .replace(/[\\/]/g, '\\\\')
            .replace(/^\\\\|\\\\$/g, '');
    }
}

// CLI handler
async function main() {
    const manager = new VarianceManager();
    await manager.initialize();

    const [command, arg] = process.argv.slice(2);

    try {
        switch (command) {
            case 'monitor':
                console.log(await manager.monitor(arg));
                break;
            case 'finalize':
                console.log(await manager.finalize(arg));
                break;
            case 'show':
                const versions = await manager.show(arg);
                console.log(`History for "${arg}":`);
                versions.forEach(version => {
                    console.log(`
Version ${version.versionNumber}:
- Version Hash: ${version.versionHash}
- Virtual Path: ${version.virtualPath}
- Timestamp: ${version.timestamp}
                    `);
                });
                break;
            case 'restore':
                console.log(await manager.restore(arg));
                break;
            default:
                console.log(`Unknown command: ${command}`);
                console.log(`Available commands: monitor, finalize, show, restore`);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Check if this file is being run directly
const isMainModule = fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export default VarianceManager;