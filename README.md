# CodeX.Hawk client side
[CodeX Hawk](https://github.com/codex-team/hawk) is an open source platform that allows you to catch errors.

You can find web interface and documentation on [hawk.so/docs](https://hawk.so/docs).

This is repository for javascript error handling.

## Instalation

### From CDN
Add script directly from GitHub.
```
<script src="https://cdn.rawgit.com/codex-team/hawk.client/master/hawk.js" async></script>
```

### Or download on your own server
Download [hawk.js](https://github.com/codex-team/hawk.client/blob/master/hawk.js) file and add it to all pages of your site.
```
<script src="hawk.js" async></script>
```

## Usage

### Get token
First of all, you should register an account on [hawk.so](https://hawk.so/join).

Then you get the account [register your domain name](https://hawk.so/websites/create).
You'll get token for new domain on email. Or you can just copy it on [settings page](https://hawk.so/garage/settings).

### Initialize Hawk
To initialize Hawk just call the `hawk.init()` method when script is ready and pass there your token:
```
hawk.init(token);
```

Or put `onload="hawk.init(token)"` into script tag.
```
<script src="https://cdn.rawgit.com/codex-team/hawk.client/master/hawk.js" onload="hawk.init(token)" async></script>
```

### Additional parameters
By default Hawk sends errors to `wss://hawk.so:8070/catcher/client`.
But you can change params passing them to `init` method (`null` for default):

Default values:
`host` = `hawk.so`
`port` = `8070`
`path` = `catcher/client`
`security` = `true` (wss)
```
hawk.init(token, host, port, path, security)
```

### Testing and server responses
To make sure that Hawk is working right, call `hawk.test()` method in browser's console.
`test` method sends fake error to server. So if you get it in your profile, everything works correctly.

Also in browser's console you can find out some Hawk warnings and server responses.
For example, if you get `Access denied` response, something wrong with your token.
