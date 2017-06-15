# Codex.Hawk client side
[Codex Hawk](https://github.com/codex-team/hawk) is an open source platform allows you to catch errors.

You can find web interface and documentation on [hawk.ifmo.su](https://hawk.ifmo.su).

This is repository for javascript error handling.

## Instalation

### From CDN
Add script directly from GitHub
```
<script src="https://raw.githubusercontent.com/codex-team/hawk.client/master/hawk.js"></script>
```

### Or just download
Download [hawk.js](https://github.com/codex-team/hawk.client/blob/master/hawk.js) file and add it to all pages of your site.
```
<script src="hawk.js"></script>
```

## Usage

### Token
First of all, you should register an account on [hawk.ifmo.su](https://hawk.ifmo.su/join)

After you get the account [register your domain name](htpps://hawk.ifmo.su/websites/create). 
You'll get token for new domain on email. Or you can just copy it on [settings page.](htpps://hawk.ifmo.su/garage/settings) 

### Initialize Hawk
To initialize Hawk just call the `hawk.init()` method and pass there your token:
```
<script>
    hawk.init(token)
</script>
```

### Additional parameters
By default Hawk sends errors to `hawk.ifmo.su:8000/catcher/client` using `ws` protocol.
But you can change `host`, `port`  and `path`, passing them to `init` method (`false` for default):
```
<script>
    hawk.init(token, host, port, path)
</script>
```

### Testing and server responses
To make sure that Hawk is working right, call `hawk.test()` method in browser's console.
`test` method sends fake error to server . So if you get it in your profile, everything works correctly.

Also in browser's console you can find out some Hawk warnings and server responses. 
For example, if you get `Access denied` response, something wrong with your token