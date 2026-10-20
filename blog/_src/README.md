# ORELVI blog

Posts live in `posts/*.md`. Front matter needs `title`, `slug`, `date` (YYYY-MM-DD) and
`description`; `tag` is optional, `draft: true` hides a post, and a future `date` holds it
back until a build on or after that day.

    node blog/_src/build.mjs

writes `blog/`, `sitemap.xml` and `robots.txt`. Commit the output; GitHub Pages serves it.
Only write what is true: no invented statistics, reviews or client results.
