Boston: the other half of [normalizr]
===

The normalizr library offers excellent features for normalizing deeply-nested data structures
into a simple entity store. Returning the normalized data to its denormalized shape is not
as easy, however. Boston makes this process transparent: pass in the entity schema that you used
to normalize, an entity collection, and it will return the denormalized values.

### Installation

```
npm install boston
```

Boston has no dependencies and a small codebase.

### Usage

Imagine you have the following normalized entities:

```js
const entities = {
  articles: {
    1: {
      id: 1,
        title: 'Some Article',
        author: 1
    },
    2: {
      id: 2,
        title: 'Other Article',
        author: 1
    }
  },
  authors: {
    1: {
      id: 1,
        name: 'Dan'
    }
  }
}
```

And you want to denormalize it so that authors appear inline with the article they authored:

```js
[{
  id: 1,
  title: 'Some Article',
  author: {
    id: 1,
    name: 'Dan'
  }
}, {
  id: 2,
  title: 'Other Article',
  author: {
    id: 1,
    name: 'Dan'
  }
}]
```

We set up our schema using the normalizr primitives:

```js
const article = new Schema('articles');
const user = new Schema('users');

article.define({ author: user });
```

We can then call denormalize on the collection of entities to retrieve the denormalized value:

```js
import { denormalize } from 'boston';

const article = denormalize(article, entities, 1);
```

`article` should look something like this:

```js
{
  id: 1,
  title: 'Some Article',
  author: {
    id: 1,
    name: 'Dan'
  }
}
```

Or, to denormalize an array of articles:

```js
denormalize(arrayOf(article), entities, [1,2]);
```



[normalizr]: https://github.com/paularmstrong/normalizr