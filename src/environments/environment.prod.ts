export const environment = {
    production: true,
    proxyUrl: "https://gw.tidymail.io:443/",
    defaultSearchQuery: { 'HEADER': ['list-unsubscribe', '@'] },
    gmailSearchQuery: { 'X-GM-RAW': "label:^unsub" } ,
    fetchBatchSize: 100,
    fetchImapFlags: ['uid', 'flags', 'BODY.PEEK[HEADER.FIELDS (DATE)]', 'BODY.PEEK[HEADER.FIELDS (SUBJECT)]', 'BODY.PEEK[HEADER.FIELDS (FROM)]', 'BODY.PEEK[HEADER.FIELDS (LIST-UNSUBSCRIBE)]'],
    corsProxy: "https://tidymail.io/backend/cp?url="
  };