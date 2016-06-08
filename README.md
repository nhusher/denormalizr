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

### Broken references

Sometimes, an entity will reference another entity that does not exist in the store. Perhaps it
was removed from the store, perhaps it never existed, or perhaps it's being retrieved from the
server and hasn't yet arrived. For these faulty references, Boston will return an object that
contains just the entity's identifier and a symbol indicating that it is an unresolved entity.

You can check for this value using the `isResolved` functon provided by the library:

```
import { denormalize, isResolved } from 'boston';

const empty = denormalize(article, {}, 1); // { id: 1, @resolved: false }
isResolved(empty) // false
```

Where `@resolved` represents a non-enumerable symbol indicating that the object is not resolved.
isResolved will return true for any value that does not have the `@resolved` symbol affixed to it.

A more complex example:
```
const entities = {
  articles {
    3: {
      id: 3,
      title: 'A final article',
      author: 6 // this author isn't in the store yet
    }
  }
};

const article = denormalize(article, entities, 3);
```

`article` now contains the value:

```
{
  id: 3,
  title: 'A final article',
  author: {
    id: 6,
    @resolved: false // non-enumerable symbol
  }
}
```


### Implementation

To avoid circular reference hell and denormalizing huge entity trees, Boston uses ES5 getters
to dereference foreign entities. When you first retrieve a foreign entity value, it is
denormalized and cached internally so that future references happen quickly. In principle,
these objects behave just like regular objects, but in practice sometimes this dereferencing
strategy can confuse some JS libraries. For example, nodejs' deepEquals function in the
assertions and unit testing module.

[normalizr]: https://github.com/paularmstrong/normalizr