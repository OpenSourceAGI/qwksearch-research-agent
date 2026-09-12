'use client';

import { HomeScrollStack } from '@/components/layout/HomeScrollStack';
import { traceSsr } from '@/lib/debug/ssr-trace';

const Home = () => {
  // The homepage is the route the mystery 500 was reported on, so it gets its
  // own breadcrumb: a trace that reaches `layout:render:returning-tree` but
  // never reaches here puts the failure between the two — i.e. in the provider
  // stack, not in the page.
  traceSsr('home:page:render');
  return <HomeScrollStack />;
};

export default Home;

traceSsr('module:app/page');
