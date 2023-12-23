# noggin-server

noggin-server is a part of the **reagent** project. This server can be used to self-host noggins that have been created within reagent. reagent (hosted at `https://rea.gent`) is the *configuration* or *authoring* tool used to create noggins, but noggin-server is the software running at `https://noggin.rea.gent/`, which is where you make requests that pass through to AI models.

reagent and noggin-server are both open-source software but are offered under different licenses. The code in the noggin-server repository is offered under the Apache license version 2, meaning you are welcome to include this code, including your own modifications, even in proprietary software, as long as you provide attribution. The reagent repository's code is more restrictively licensed (under AGPLv3), but you won't need to download or run that code unless you want to host your own noggin authoring server.

## Reverse proxies

When used with reagent, noggin-server expects **not** to run behind a reverse proxy. reagent seeks to provide detailed debugging tools in its execution history view, allowing users to see specific details of their requests (like where the request came from, or whether there were TLS errors in the request).

noggin-server will still work behind a reverse proxy, but some of these debugging tools will not function correctly when the server is used with reagent.