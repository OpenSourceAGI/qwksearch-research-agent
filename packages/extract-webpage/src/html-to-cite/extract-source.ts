
/**
 * Extract source from document using common class names
 *
 * @param {document} document document or dom object with article content
 * @returns {object} source
*/
export function extractSource(document) {
  var source, arrSources;

  if (typeof source == "undefined") {
    arrSources = document.getElementsByClassName("og:site_name");
    if (arrSources.length <= 0) {
      arrSources = document.getElementsByClassName("cre");
    }
    if (arrSources.length <= 0) {
      var arrMeta = document.getElementsByTagName("meta");

      for (var i = 0; i < arrMeta.length; i++) {
        if (arrMeta[i].getAttribute("property") == "og:site_name") {
          source = arrMeta[i].content;
        }
      }
    }
    if (arrSources.length > 0) {
      source = arrSources[0].content;
    }
  }
  return source;
}
