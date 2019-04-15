// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    // proxyUrl: "http://127.0.0.1:8888/",
    proxyUrl: "https://gw.tidymail.io:443/",
    defaultSearchQuery: { 'HEADER': ['list-unsubscribe', '@'] },
    gmailSearchQuery: { 'X-GM-RAW': "label:^unsub" } ,
    fetchBatchSize: 200,
    fetchImapFlags: ['uid', 'flags','rfc822.size','BODY.PEEK[HEADER.FIELDS (DATE)]', 'BODY.PEEK[HEADER.FIELDS (SUBJECT)]', 'BODY.PEEK[HEADER.FIELDS (FROM)]', 'BODY.PEEK[HEADER.FIELDS (LIST-UNSUBSCRIBE)]'],
    countAsNewInMonth: 6,
    corsProxy: "https://tidymail.io/backend/cp?url=",
  };

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
