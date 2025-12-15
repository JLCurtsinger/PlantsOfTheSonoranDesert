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
    quickIdChecklist,
    seasonalNotes,
    ethicsAndDisclaimers,
    wildlifeValue,
    interestingFacts,
    sortOrder,
    heroImage{
      ...,
      asset->{
        _id,
        originalFilename
      }
    },
    gallery[]{
      _key,
      ...,
      asset->{
        _id,
        originalFilename
      }
    },
    detailSections[]{
      key,
      title,
      alt,
      galleryKey,
      description,
      image{
        ...,
        asset->{
          _id,
          originalFilename
        }
      }
    }
  }
`

export const allPlantsQuery = groq`
  *[_type == "plant"] | order(coalesce(sortOrder, 999) asc, title asc){
    _id,
    title,
    "slug": slug.current,
    scientificName,
    about,
    additionalInfo,
    uses,
    quickIdChecklist,
    seasonalNotes,
    ethicsAndDisclaimers,
    wildlifeValue,
    interestingFacts,
    sortOrder,
    heroImage{
      ...,
      asset->{
        _id,
        originalFilename
      }
    },
    gallery[]{
      _key,
      ...,
      asset->{
        _id,
        originalFilename
      }
    },
    detailSections[]{
      key,
      title,
      alt,
      galleryKey,
      description,
      image{
        ...,
        asset->{
          _id,
          originalFilename
        }
      }
    }
  }
`