export const environment = {
    production: true,
    proxyUrl: "https://gw.tidymail.io:443/",
    defaultSearchQuery: { 'HEADER': ['list-unsubscribe', '@'] },
    gmailSearchQuery: { 'X-GM-RAW': "label:^unsub" } ,
    fetchBatchSize: 100,
    fetchImapFlags: ['uid', 'flags','rfc822.size','BODY.PEEK[HEADER.FIELDS (DATE SUBJECT FROM LIST-UNSUBSCRIBE)]'],
    countAsNewInMonth: 6,
    corsProxy: "https://tidymail.io/backend/cp?url="
  };