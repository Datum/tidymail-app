export const environment = {
  production: true,
  proxyAddress: "gw.tidymail.io",
  proxyPort: 443,
  proxyUseHttps: true,
  fetchBatchSize: 20,
  fetchImapFlags: ['uid', 'flags', 'BODY.PEEK[HEADER.FIELDS (DATE)]', 'BODY.PEEK[HEADER.FIELDS (SUBJECT)]', 'BODY.PEEK[HEADER.FIELDS (FROM)]', 'BODY.PEEK[HEADER.FIELDS (LIST-UNSUBSCRIBE)]']
};
