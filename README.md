# Variance- A lightweight version control for files, uncomplicated

<div style="text-align: center;">
    <img src="https://github.com/user-attachments/assets/4ff476e7-b287-425f-b68e-c31e36c472c1" width="500" height="500">
</div>

<p align="center">
    <img src="https://github.com/user-attachments/assets/4ff476e7-b287-425f-b68e-c31e36c472c1" width="300" height="200">
</p>


Variance is a simple and efficient version control system that tracks changes to your files. Below is a basic walkthrough of how to use it.

## 1)help command
```bash
  >node variance.js help

  [VARIANCE:HELP] LIST OF AVAILABLE COMMANDS

  variance monitor <filePath>     | adds the file at the specified file path to the list of files being monitored
  variance finalize <filePath>    | finalizes the changes to a remote location
  variance retrieve <versionHash> | replaces the file being monitored with the version specified by the versionHash
  variance view <filePath>        | view the finalization history for a given file at the specified file path
```

## 2)create a file test/test.txt
```test/test.txt
  this is initial content
```

## 3)add file to the list of files being monitored
```bash
  >node variance.js monitor test/test.txt

  [VARIANCE:MONITOR]
  FILE "C:\Users\Maaz Malik\Desktop\variance\test\test.txt" IS NOW BEING MONITORED FOR CHANGES
```

## 3)finalize the file to remote
```bash
  >node variance.js finalize test/test.txt "initial finalization"
  
  [VARIANCE:FINALIZE]
  variance/a9e61615eb103a03f494869135dac1d54069f94cddb357821ca742d77c722672/test.txt
  FILE "C:\Users\Maaz Malik\Desktop\variance\test\test.txt" FINALIZED WITH VERSION HASH a9e61615eb103a03f494869135dac1d54069f94cddb357821ca742d77c722672
```

## 2)make changes to the file test/test.txt
```test/test.txt
  this is initial content

  first update
```

## 5)finalize the updated file to remote
```bash
  >node variance.js finalize test/test.txt "first update"
      
  [VARIANCE:FINALIZE]
  variance/1a7418504bb9b4dd6956351d264397a665179d8c35d4509a77a500c4eb911268/test.txt
  FILE "C:\Users\Maaz Malik\Desktop\variance\test\test.txt" FINALIZED WITH VERSION HASH 1a7418504bb9b4dd6956351d264397a665179d8c35d4509a77a500c4eb911268
```

## 6)view version history

```bash
  >node variance.js view test/test.txt
  [VARIANCE:VIEW]
  C:\Users\Maaz Malik\Desktop\variance\test\test.txt
  {
    versions: [
      {
        versionHash: 'a9e61615eb103a03f494869135dac1d54069f94cddb357821ca742d77c722672',
        message: 'initial finalization',
        localPath: 'C:\\Users\\Maaz Malik\\Desktop\\variance\\test\\test.txt',
        virtualPath: 'variance/a9e61615eb103a03f494869135dac1d54069f94cddb357821ca742d77c722672/test.txt',
        timestamp: '2025-01-28T19:10:59.466Z'
      },
      {
        versionHash: '1a7418504bb9b4dd6956351d264397a665179d8c35d4509a77a500c4eb911268',
        message: 'first update',
        localPath: 'C:\\Users\\Maaz Malik\\Desktop\\variance\\test\\test.txt',
        virtualPath: 'variance/1a7418504bb9b4dd6956351d264397a665179d8c35d4509a77a500c4eb911268/test.txt',
        timestamp: '2025-01-28T19:11:58.287Z'
      }
    ]
  }
```

## 7)restore any version
```bash
  >node variance.js restore a9e61615eb103a03f494869135dac1d54069f94cddb357821ca742d77c722672

  [VARIANCE:RESTORE]
  FILE "C:\Users\Maaz Malik\Desktop\variance\test\test.txt" RESTORED TO VERSION a9e61615eb103a03f494869135dac1d54069f94cddb357821ca742d77c722672 : initial finalization"
```

## 8)restored file changes in test/test.txt
```test/test.txt
  this is initial content
```
