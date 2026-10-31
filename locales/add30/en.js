module.exports = {
 nav: { blog: "Blog" },
 blogad: {
  tab: "Blog", new: "New post", count: "{n} posts, {p} published", viewBlog: "Open blog", title: "Title", lang: "Language", cat: "Category", updated: "Updated", edit: "Edit", view: "View", none: "No posts yet. Write the first one.",
  slug: "Web address (slug)", slugHint: "Small English letters, numbers and dashes. Becomes /blog/your-slug/", excerpt: "Short summary (shown in lists and Google)", cover: "Cover image link (https)", tags: "Tags (comma separated)",
  group: "Translation group", groupHint: "Give translations of the same article the same group, e.g. sade-sati", body: "Article", preview: "Preview",
  mdHint: "## Heading · **bold** · *italic* · [link](https://…) · ![image](https://…) · - list · 1. list · > quote", empty: "The preview appears here as you type.",
  save: "Save", back: "All posts", delQ: "Delete the post \"{n}\"? This can't be undone.", saved: "Draft saved.", savedPub: "Published. It is live on the blog now.",
  needTitle: "Add a title.", needSlug: "Add a web address (slug) in English letters.", needHttps: "The cover image link must start with https://", dupSlug: "A post with this web address already exists in this language.",
  setup: "The blog table is missing. Run supabase/v13_blog.sql in the Supabase SQL editor.",
  st: { draft: "Draft", published: "Published" },
  cats: { basics: "Jyotish basics", planets: "Planets", festivals: "Festivals", transits: "Transits", remedies: "Remedies", matching: "Marriage & matching", muhurta: "Muhurta", numerology: "Numerology", news: "News" }
 },
 seo: { blog: {
  eye: "Grahavani blog", crumb: "Blog", h1: "Jyotish articles and guides", title: "Jyotish Blog – Articles on Kundali, Planets, Festivals and Remedies | Grahavani",
  desc: "Clear articles on Vedic astrology: how to read a Kundali, planets and transits, festivals and vrat, muhurta, marriage matching and simple remedies.",
  lede: "Plain-language articles on Vedic astrology, festivals and remedies, written to help you understand your own chart.",
  catH1: "{c}: articles", catTitle: "{c} – Jyotish Articles | Grahavani", catsH: "Categories", all: "All articles",
  empty: "No articles here yet. New posts are coming soon.", mins: "{n} min read", newer: "Newer", older: "Older",
  toc: "In this article", alsoIn: "Also in:", relatedH: "More to read", back: "All articles",
  cta: "See what your own chart says.", ctaBtn: "Make your free Kundali",
  cat: { basics: "Jyotish basics", planets: "Planets", festivals: "Festivals", transits: "Transits", remedies: "Remedies", matching: "Marriage & matching", muhurta: "Muhurta", numerology: "Numerology", news: "News" }
 } }
};
