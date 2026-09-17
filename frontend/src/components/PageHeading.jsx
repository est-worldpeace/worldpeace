import React from 'react';
import { pageMeta } from '../data/pageMeta.js';

export function PageHeading({ page }) {
  const [eyebrow, title, description] = pageMeta[page];
  return <section className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></section>;
}
