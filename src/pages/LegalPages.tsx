import { Link } from 'react-router-dom';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { LEGAL_CONTACT, LEGAL_PAGES, LEGAL_PAGE_LIST } from '../content/legal';
import type { LegalSlug } from '../content/legal';

function headingId(heading: string) {
  return `section-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const page = LEGAL_PAGES[slug];
  const others = LEGAL_PAGE_LIST.filter((item) => item.slug !== slug);
  return <main className="container legal-page">
    <header className="legal-hero">
      <p className="eyebrow">{page.kicker}</p>
      <h1>{page.title}</h1>
      <p className="legal-summary">{page.summary}</p>
      <div className="legal-meta">
        <span><ShieldCheck size={14}/> Effective {page.effectiveDate}</span>
        <span>Last updated {page.lastUpdated}</span>
      </div>
    </header>

    <div className="legal-layout">
      <nav className="legal-toc" aria-label={`${page.title} sections`}>
        <span className="legal-toc-title">ON THIS PAGE</span>
        <ol>
          {page.sections.map((section) => <li key={section.heading}><a href={`#${headingId(section.heading)}`}>{section.heading}</a></li>)}
        </ol>
        <div className="legal-help">
          <Mail size={16}/>
          <span><strong>Need help?</strong><a href={`mailto:${LEGAL_CONTACT.email}`}>{LEGAL_CONTACT.email}</a></span>
        </div>
      </nav>

      <article className="legal-body">
        {page.sections.map((section) => <section id={headingId(section.heading)} key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
          {section.note && <p className="legal-note">{section.note}</p>}
        </section>)}
      </article>
    </div>

    <nav className="legal-related" aria-label="Other policies">
      <div><span className="eyebrow">MORE POLICIES</span><h2>Know where you stand.</h2></div>
      <div className="legal-related-links">
        {others.map((item) => <Link key={item.slug} to={item.path}>{item.shortTitle}<ArrowRight size={14}/></Link>)}
      </div>
    </nav>
  </main>;
}

export function PrivacyPolicyPage() { return <LegalPage slug="privacy-policy"/>; }
export function CookiePolicyPage() { return <LegalPage slug="cookie-policy"/>; }
export function ReturnRefundPolicyPage() { return <LegalPage slug="return-refund-policy"/>; }
export function TermsPage() { return <LegalPage slug="terms-and-conditions"/>; }
