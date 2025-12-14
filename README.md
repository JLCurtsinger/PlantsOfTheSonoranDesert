This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Sanity Content Sync

This project uses Sanity as the source of truth for plant gallery captions and detail sections. The sync workflow uses key-based matching to link local plant data to Sanity image assets.

### Workflow

1. **Upload images to Sanity Studio:**
   - Upload hero image to the `heroImage` field
   - Upload gallery images to the deprecated `gallery` field (in the correct order)
   - Images will be referenced by the sync script

2. **Run the sync script:**
   ```bash
   npm run sanity:sync-plant -- --slug saguaro-cactus
   ```
   
   The script will:
   - Read local plant data from `lib/plant-data/<slug>.ts`
   - Derive stable keys from image paths (e.g., "adultSaguaro" from "/images/saguaro/adultSaguaro.webp")
   - Map local captions to Sanity image assets using keys
   - Populate `galleryItems[]` and `detailSections[]` in Sanity with keys, captions, and image references

3. **Verify in Sanity Studio:**
   - Check that `galleryItems` and `detailSections` are populated with keys and text
   - Images should now display with correct captions

4. **Optional cleanup:**
   - Once Sanity has keyed items, you can delete local images from the repo if they're no longer referenced by local fallback

### Key-Based Matching

The sync script uses stable keys derived from local image paths to match captions to Sanity assets. This approach is robust to filename changes (camelCase vs dashes) and doesn't depend on URL string matching.

- **Gallery items:** Mapped by index from the deprecated `gallery[]` array
- **Detail sections:** Matched by key to either `heroImage` or `gallery[]` items
- **Keys:** Derived from image basename (e.g., "adultSaguaro" from "adultSaguaro.webp")

### Environment Variables

The sync script requires these environment variables in `.env.local`:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION` (optional, defaults to '2024-01-01')
- `SANITY_API_WRITE_TOKEN` (required for write access)
