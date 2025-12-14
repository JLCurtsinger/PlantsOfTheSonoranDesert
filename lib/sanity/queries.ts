import groq from 'groq'

export const plantBySlugQuery = groq`
  *[_type == "plant" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    scientificName,
    about,
    additionalInfo,
    uses,
    sortOrder,
    heroImage,
    gallery
  }
`

export const allPlantsQuery = groq`
  *[_type == "plant"] | order(sortOrder asc, title asc){
    _id,
    title,
    "slug": slug.current,
    scientificName,
    about,
    additionalInfo,
    uses,
    sortOrder,
    heroImage,
    gallery
  }
`