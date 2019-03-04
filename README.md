## How to use/develop
- run `npm install`
- run `npm run watch`
- goto: `chrome://extensions` in the browser and enable 'developer mode'
- press `Load unpacked` and target the folder `angular/dist`

The project is automatically being watched, any changes to the files will recompile the project.

**NOTE**: changes to the contentPage/backgroundPage requires you to reload the extension in `chrome://extensions`


## Build/package for production

- run `npm run build:production`

## Angular folder
This folder contains the angular source code.

## Chrome folder
This folder contains the contentPage/backgroundPage script for the google chrome extension
