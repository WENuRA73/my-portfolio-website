# Update the Sitelume portfolio

The **Selected work** section is built from `portfolio-projects.js`. Projects appear under one of four groups: `websites`, `webapps`, `games`, or `software`. Keep illustrative concepts in the separate **Design explorations** section.

1. Put a project screenshot or approved visual in `images/portfolio/`.
2. Add an object to `window.sitelumeProjects` in `portfolio-projects.js` using the appropriate `group` value:

```js
{
  title: 'Project name',
  group: 'webapps',
  category: 'Web application',
  status: 'Completed',
  description: 'What the product does and who it helps.',
  highlights: 'Design · Development · Testing',
  image: 'images/portfolio/project-image.png',
  imageAlt: 'Description of the actual image',
  url: 'https://public-project-url.example'
}
```

`title`, `description`, and `group` are needed for a useful portfolio entry. `category`, `status`, `highlights`, `image`, `imageAlt`, and `url` are optional. Omit `url` if a project has no public page. Describe the actual image accurately: artwork, an interface screenshot, or a product photo are different things.

The current entries are based on local project sources. **42Clothing appears twice** because it has a customer-facing website and a commerce web app. Both cards describe different parts of the same platform and are explicitly marked as development previews; the public shop uses sample products. Replace the storefront card's campaign image with an approved screenshot when one is available. Do not claim a project is complete until that is verified.
