import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import DspaceClient from './DspaceClient6.js';
import { fileURLToPath } from 'url';
import "colors";
import { error } from 'console';

class Variance {
    constructor() {
        this.varianceFilePath = path.join(process.cwd(), 'variance.json');
        this.client = new DspaceClient();
    }

    async readVarianceData() {
        try {
            try {
                await fs.access(this.varianceFilePath);
            } catch (error) {
                const defaultData = { "files": {} };
                await fs.writeFile(this.varianceFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
            }
            const data = await fs.readFile(this.varianceFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Failed to read variance data: ${error.message}`);
        }
    }

    async writeVarianceData(data) {
        try {
            await fs.writeFile(this.varianceFilePath, JSON.stringify(data, null, 4));
        } catch (error) {
            throw new Error(`Failed to write variance data: ${error.message}`);
        }
    }

    async readTextFile(filePath){
        const content = await fs.readFile(filePath, 'utf-8');
        return content
    }

    async monitor(filePath) {
        console.log("[VARIANCE:MONITOR]")

        filePath = path.resolve(this.normalizePath(filePath))

        try{
            await fs.access(filePath)
        }catch(error){
            throw new Error("FILE DOESN'T EXIST AT THE PROVIDED PATH. PLEASE PROVIDE A VALID PATH")
        }

        const data = await this.readVarianceData();

        if (data.files[filePath]) {
            throw new Error(`FILE "${filePath}" IS ALREADY BEING MONITORED FOR CHANGES`);
        }

        data.files[filePath] = { versions: [] };
        
        await this.writeVarianceData(data);
        
        console.log(`FILE "${filePath}" IS NOW BEING MONITORED FOR CHANGES`);
    }

    async finalize(filePath, message) {
        console.log("[VARIANCE:FINALIZE]")

        filePath = path.resolve(this.normalizePath(filePath))

        const data = await this.readVarianceData();

        try{
            await fs.access(filePath)
        }catch(error){
            throw new Error("FILE DOESN'T EXIST AT THE PROVIDED PATH. PLEASE PROVIDE A VALID PATH")
        }

        if (!data.files[filePath]) {
            throw new Error(`FILE "${filePath}" IS NOT BEING MONITORED. USE | variance monitor <filePath>`);
        }

        const versionHash = this.generateVersionHash();
        const virtualPath = this.createVirtualPath(versionHash, filePath);
        console.log(virtualPath)

        this.client.upload(filePath, virtualPath)

        const version = {
            versionHash,
            message,
            localPath:filePath,
            virtualPath,
            timestamp: new Date().toISOString(),
        };

        data.files[filePath].versions.push(version);
        await this.writeVarianceData(data);
        console.log(`FILE "${filePath}" FINALIZED WITH VERSION HASH ${versionHash}`);
    }

    async restore(versionHash) {
        console.log("[VARIANCE:RESTORE]")

        const data = await this.readVarianceData();
        const fileEntry = this.findFileEntryByVersionHash(data, versionHash);

        if (!fileEntry) {
            throw new Error(`VERSION "${versionHash}" NOT FOUND`);
        }

        const [filePath, details] = fileEntry;
        const version = details.versions.find(v => v.versionHash === versionHash);

        const localPath = version.localPath
        try{
            await fs.access(localPath)

        }catch(error){
            const dir = path.dirname(localPath)
            await fs.mkdir(dir, {recursive:true})
            await fs.writeFile(localPath, "", "utf-8")
        }
        
        const directory = await this.client.getUserDirectory();
        const id = await this.findIdByPath(directory.children, `root\\${version.virtualPath}`);

        if (!id) {
            throw new Error('FILE ID COULD NOT BE RESOLVED. VERSION LOST');
        }

        const result = await this.client.retrieve(id);
        const restoredContent = await fs.readFile(result.path, 'utf8');
        await fs.writeFile(filePath, restoredContent);

        console.log(`FILE "${filePath}" RESTORED TO VERSION ${versionHash} : ${version.message}"`);

    }

    async view(filePath) {
        console.log("[VARIANCE:VIEW]")
        filePath = path.resolve(this.normalizePath(filePath))
        console.log(filePath)
        const data = await this.readVarianceData();
        const versions = data.files[filePath]
        console.log(versions)
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
    const manager = new Variance();
    // extracting the last two arguments
    const [command, arg, message] = process.argv.slice(2);

    switch (command) {
        case "help":
            await manager.readTextFile("help.txt")
            break;
        case 'monitor':
            if(!arg)throw new Error("NO VALID FILE PATH PROVIDED. CORRECT FORMAT | variance monitor <filePath>")
            await manager.monitor(arg)
            break;
        case 'finalize':
            if(!arg)throw new Error("NO VALID FILE PATH PROVIDED. CORRECT FORMAT | variance finalize <filePath> <message>")
            if(!message)throw new Error("NO FINALIZATION MESSAGE PROVIDED. CORRECT FORMAT | variance finalize <filePath> <message>")
            await manager.finalize(arg, message);
            break;
        case 'restore':
            if(!arg)throw new Error("NO FINALIZATION HASH PROVIDED. CORRECT FORMAT | variance restore <hash>")
            await manager.restore(arg)
            break;
        case 'view':
            await manager.view(arg)
            break;
        default:
            console.error(`
NO SUCH COMMAND EXISTS | variance ${command}
FOR LIST OF AVAILABLE COMMANDS, USE | variance help
            `)
        }
    }

const isMainModule = import.meta.filename === process.argv[1];
if (isMainModule) {
    // this is known as promise chaining and is a perfectly valid way to use async functions
    main().catch(error => {
        console.error(`
[VARIANCE:ERROR] | ${error}
        `)
        process.exit(1);
    });
}