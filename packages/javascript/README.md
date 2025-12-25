# Hawk JavaScript Catcher

Error tracking for JavaScript/TypeScript applications.

## Installation

We recommend adding Hawk script to page above others to prevent missing any errors.

### Install via NPM or Yarn

Install package

```shell
npm install @hawk.so/javascript --save
```

```shell
yarn add @hawk.so/javascript
```

Then import `@hawk.so/javascript` module to your code.

```js
import HawkCatcher from '@hawk.so/javascript';
```

### Load from CDN

Get a specific version bundle path from [@hawk.so/javascript](https://www.jsdelivr.com/package/npm/@hawk.so/javascript)
— open the page and copy the link. Do not use @latest, as your setup may break in case of a major API update.

Then require this script on your site.

```
<script src="..." async></script>
```

## Usage

### Get an Integration Token

First of all, you should register an account on
[hawk.so](https://hawk-tracker.ru/signup?utm_source=github&utm_medium=readme&utm_campaign=js_sdk&utm_content=signup_link).

Then create a Workspace and a Project in there. You'll get an Integration Token.

### Initialize Catcher

Create `HawkCatcher` class instance when script will be ready and pass your Integration Token:

```js
const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'});

// or

const hawk = new HawkCatcher('INTEGRATION_TOKEN');
```

Alternately, add `onload="const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'})"` attribute to the `<script>` tag.

```html
<script src="https://cdn.jsdelivr.net/npm/@hawk.so/javascript@latest/dist/hawk.js"
        onload="const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'})"></script>
```

Initialization settings:

| name                          | type                                                      | required     | description                                                                         |
|-------------------------------|-----------------------------------------------------------|--------------|-------------------------------------------------------------------------------------|
| `token`                       | string                                                    | **required** | Your project's Integration Token                                                    |
| `release`                     | string/number                                             | optional     | Unique identifier of the release. Used for source map consuming (see below)         |
| `user`                        | {id: string, name?: string, image?: string, url?: string} | optional     | Current authenticated user                                                          |
| `context`                     | object                                                    | optional     | Any data you want to pass with every message. Has limitation of length.             |
| `vue`                         | Vue constructor                                           | optional     | Pass Vue constructor to set up the [Vue integration](#integrate-to-vue-application) |
| `disableGlobalErrorsHandling` | boolean                                                   | optional     | Do not initialize global errors handling                                            |
| `disableVueErrorHandler`      | boolean                                                   | optional     | Do not initialize Vue errors handling                                               |
| `consoleTracking`             | boolean                                                   | optional     | Initialize console logs tracking                                                    |
| `beforeSend`                  | function(event) => event                                  | optional     | This Method allows you to filter any data you don't want sending to Hawk            |

Other available [initial settings](types/hawk-initial-settings.d.ts) are described at the type definition.

## Manual sending

You can send errors or other messages to the Hawk manually, for example at your `catch` blocks or any debug conditions.

Use the `.send(message, context)` method for that. This method accepts the `message` of type `Error` or `string`
as the first parameter. The second parameter is optional, it allows passing any additional data with the event.
If you specify the `context` with the `HawkCatcher` constructor, it will be merged with the context passed to the `send`
method.

```js
// init Hawk Catcher instance
const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'});

// somewhere in try-catch block or other custom place
hawk.send(new Error('Something went wrong'), {
  myOwnDebugInfo: '1234',
});
```

## User Management

You can dynamically manage user information after the catcher is initialized:

```js
const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'});

// Set user information
hawk.setUser({
  id: 'user123',
  name: 'John Doe',
  url: '/users/123',
  image: 'https://example.com/avatar.jpg',
});

// Clear user (revert to generated user)
hawk.clearUser();
```

## Context Management

You can dynamically update context data that will be sent with all events:

```js
const hawk = new HawkCatcher({token: 'INTEGRATION_TOKEN'});

// Set context data
hawk.setContext({
  feature: 'user-dashboard',
  version: '2.1.0',
  environment: 'production',
});
```

## Source maps consuming

If your bundle is minified, it is useful to pass source-map files to the Hawk. After that you will see beautiful
original source code lines in Hawk Garage instead of minified code.

To enable source map consuming you should do two things:

- Send the source map and the release identifier to the Hawk after you build a new version of the script. For example
  with the [Hawk Webpack Plugin](https://github.com/codex-team/hawk.webpack.plugin) or with cURL request.
- Pass the release identifier to the Hawk Catcher using `release` option.

## Testing and server responses

To make sure that Hawk is working right, call `test()` method from `HawkCatcher` class instance in browser's console.
`test()` method sends fake error to server. Then, open Hawk and find a test event at the Project's page.

## Sensitive data filtering

You can filter any data that you don't want to send to Hawk. Use the `beforeSend()` hook for that reason.

```js
window.hawk = new HawkCatcher({
  token: 'INTEGRATION TOKEN',
  beforeSend(event) {
    if (event.user && event.user.name) {
      delete event.user.name;
    }

    return event;
  }
})
```

## Dismiss error

You can use the `beforeSend()` hook to prevent sending a particular event. Return `false` for that.

## Usage with &nbsp; <img src="https://cdn.svglogos.dev/logos/vue.svg" width="22"> &nbsp;Vue.js

Vue apps have their own error handler, so if you want to catcher errors thrown inside Vue components, you should set up
a Vue integration.

Pass the Vue constructor with the initial settings:

```js
import Vue from 'vue';

const hawk = new HawkCatcher({
  token: 'INTEGRATION_TOKEN',
  vue: Vue // the Vue constructor you tweak
});
```

or pass it any moment after Hawk Catcher was instantiated:

```js
import Vue from 'vue';

const hawk = new HawkCatcher({
  token: 'INTEGRATION_TOKEN',
});

hawk.connectVue(Vue)
```

## Usage with &nbsp; <img src="https://cdn.svglogos.dev/logos/react.svg" width="22"> &nbsp;React

React is suppported out of the box. No additional setup required.

Create the Hawk Catcher instance in a `index.js` file of your project.

```js
import HawkCatcher from '@hawk.so/javascript';

const hawk = new HawkCatcher({
  token: 'INTEGRATION_TOKEN'
});
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
See the [LICENSE](./LICENSE) file for the full text.
