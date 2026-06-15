# Sample Docs — Home

Welcome to the **Markdown Renderer** sample folder. Pick this folder to try the viewer.

## Features exercised here

- Headings, **bold**, _italic_, and `inline code`
- A fenced code block with syntax highlighting
- A table
- A relative image (see the [Guide](guide.md))
- Internal links between documents

## Code block

```js
function greet(name) {
  return `Hello, ${name}!`;
}
console.log(greet("world"));
```

## Table

| Stack | Language | Tool |
|-------|----------|------|
| viewer | JavaScript | marked |
| tests  | JavaScript | Vitest |

## Navigate

- Go to the [Guide](guide.md) (internal link → loads in the viewer)
- Visit [the marked project](https://github.com/markedjs/marked) (external → new tab)
