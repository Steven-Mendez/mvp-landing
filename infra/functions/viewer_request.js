// CloudFront Function (cloudfront-js-2.0), viewer request.
// - www.<domain> answers a permanent redirect to <domain>, path and query kept.
// - Astro builds pages as <path>/index.html; S3 behind OAC has no index documents, so
//   /foo/ and /foo are rewritten to /foo/index.html. Files (a dot in the last segment)
//   pass through untouched.
function handler(event) {
  var request = event.request
  var host = request.headers.host ? request.headers.host.value : ""

  if (host.indexOf("www.") === 0) {
    var query = []
    for (var key in request.querystring) {
      var param = request.querystring[key]
      var values = param.multiValue ? param.multiValue : [param]
      for (var i = 0; i < values.length; i++) {
        query.push(values[i].value === "" ? key : key + "=" + values[i].value)
      }
    }
    var location =
      "https://" +
      host.slice(4) +
      request.uri +
      (query.length ? "?" + query.join("&") : "")
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: location } }
    }
  }

  var uri = request.uri
  if (uri.endsWith("/")) {
    request.uri = uri + "index.html"
  } else if (uri.slice(uri.lastIndexOf("/") + 1).indexOf(".") === -1) {
    request.uri = uri + "/index.html"
  }
  return request
}
