// @flow strict
import React from 'react';
import { Link } from 'gatsby';
import kebabCase from 'lodash/kebabCase';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import Page from '../components/Page';
import { useMaterialsList, useSiteMetadata } from '../hooks';
import styles from './materials-list-template.module.scss';

const MaterialsListTemplate = () => {
  const { title, subtitle } = useSiteMetadata();
  const materials = useMaterialsList();

  return (
    <Layout title={`Writing Material - ${title}`} description={subtitle}>
      <Sidebar />
      <Page title="Materials">
        <ul>
          {materials.map((material) => (
            <li key={material.node.id}>
              <span className={material.node.frontmatter.isWritten ? styles['is-written'] : undefined}>
                {material.node.frontmatter.title}
                </span>
            </li>
          ))}
        </ul>
      </Page>
    </Layout>
  );
};

export default MaterialsListTemplate;
