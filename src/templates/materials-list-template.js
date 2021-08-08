// @flow strict
import React from 'react';
import { Link } from 'gatsby';
import kebabCase from 'lodash/kebabCase';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import Page from '../components/Page';
import { useSiteMetadata } from '../hooks';

const MaterialsListTemplate = () => {
  const { title, subtitle } = useSiteMetadata();

  return (
    <Layout title={`Writing Material - ${title}`} description={subtitle}>
      <Sidebar />
      <Page title="Material">
          <p>This is Material page</p>
      </Page>
    </Layout>
  );
};

export default MaterialsListTemplate;
