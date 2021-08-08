// @flow strict
import { useStaticQuery, graphql } from 'gatsby';

const useMaterialsList = () => {
  const { allMarkdownRemark } = useStaticQuery(
    graphql`
      query MaterialsListQuery {
        allMarkdownRemark(
          filter: {frontmatter: {template: {eq: "material"}}},
          sort: {fields: frontmatter___date}
        ) {
          edges {
            node {
              frontmatter {
                title
                slug
                date
                isWritten
              }
            }
          }
        }
      }
    `
  );

  return allMarkdownRemark.edges;
};

export default useMaterialsList;
