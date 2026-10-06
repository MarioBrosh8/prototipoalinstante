// www.prototipoalinstante.com -> https://prototipoalinstante.com, keeping the
// path and query, as a permanent redirect.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = "https:";
    url.hostname = "prototipoalinstante.com";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  },
};
