import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { HTMLAttributes, HTMLInputTypeAttribute, ImageMetadata } from 'astro/types';

export interface Post {
  /** A unique ID number that identifies a post. */
  id: string;

  /** A post’s unique slug – part of the post’s URL based on its name, i.e. a post called “My Sample Page” has a slug “my-sample-page”. */
  slug: string;

  /**  */
  permalink: string;

  /**  */
  publishDate: Date;
  /**  */
  updateDate?: Date;

  /**  */
  title: string;
  /** Optional summary of post content. */
  excerpt?: string;
  /**  */
  image?: ImageMetadata | string;

  /**  */
  category?: Taxonomy;
  /**  */
  tags?: Taxonomy[];
  /**  */
  author?: string;

  /**  */
  metadata?: MetaData;

  /**  */
  draft?: boolean;

  /**  */
  Content?: AstroComponentFactory;
  content?: string;

  /**  */
  readingTime?: number;
}

export interface Taxonomy {
  slug: string;
  title: string;
}

export interface MetaData {
  title?: string;
  ignoreTitleTemplate?: boolean;

  canonical?: string;

  robots?: MetaDataRobots;

  description?: string;

  openGraph?: MetaDataOpenGraph;
  twitter?: MetaDataTwitter;
}

export interface MetaDataRobots {
  index?: boolean;
  follow?: boolean;
}

export interface MetaDataImage {
  url: string;
  width?: number;
  height?: number;
}

export interface MetaDataOpenGraph {
  url?: string;
  siteName?: string;
  images?: Array<MetaDataImage>;
  locale?: string;
  type?: string;
}

export interface MetaDataTwitter {
  handle?: string;
  site?: string;
  cardType?: string;
}

export interface Image {
  src: string;
  alt?: string;
}

export interface Video {
  src: string;
  type?: string;
}

export interface Widget {
  id?: string;
  isDark?: boolean;
  bg?: string;
  classes?: Record<string, string | Record<string, string>>;
}

export interface Headline {
  title?: string;
  subtitle?: string;
  tagline?: string;
  classes?: Record<string, string>;
}

interface TeamMember {
  name?: string;
  job?: string;
  image?: Image;
  socials?: Array<Social>;
  description?: string;
  classes?: Record<string, string>;
}

interface Social {
  icon?: string;
  href?: string;
}

export interface Stat {
  amount?: number | string;
  title?: string;
  icon?: string;
}

export interface Item {
  title?: string;
  description?: string;
  icon?: string;
  classes?: Record<string, string>;
  callToAction?: CallToAction;
  image?: Image;
}

export interface Price {
  title?: string;
  subtitle?: string;
  description?: string;
  price?: number | string;
  period?: string;
  items?: Array<Item>;
  callToAction?: CallToAction;
  hasRibbon?: boolean;
  ribbonTitle?: string;
}

export interface Testimonial {
  title?: string;
  testimonial?: string;
  name?: string;
  job?: string;
  image?: string | unknown;
}

export interface Input {
  type: HTMLInputTypeAttribute | 'select' | 'checkbox' | 'section';
  name: string;
  label?: string;
  autocomplete?: string;
  placeholder?: string;
  options?: Array<{ label?: string; value: string }>;
  multiple?: boolean;
  required?: boolean;
  helper?: string;
  requiredMessage?: string;
  conditional?: {
    source: string;
    showOn?: string[];
    hideOn?: string[];
    showIfAnyNot?: string[];
  };
  className?: string;
  attributes?: Record<string, string>;
}

export interface Textarea {
  label?: string;
  name?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

export interface Disclaimer {
  label?: string;
}

// COMPONENTS
export interface CallToAction extends Omit<HTMLAttributes<'a'>, 'slot'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'link';
  text?: string;
  icon?: string;
  classes?: Record<string, string>;
  type?: 'button' | 'submit' | 'reset';
}

export interface ItemGrid {
  items?: Array<Item>;
  columns?: number;
  defaultIcon?: string;
  classes?: Record<string, string>;
}

export interface Collapse {
  iconUp?: string;
  iconDown?: string;
  items?: Array<Item>;
  columns?: number;
  classes?: Record<string, string>;
}

export interface Form {
  inputs?: Array<Input>;
  textarea?: Textarea;
  disclaimer?: Disclaimer;
  button?: string;
  description?: string;
  action?: string;
  method?: string;
  encType?: string;
  geoapifyKey?: string;
  tenant?: string;
  source?: string;
  locale?: string;
}

// WIDGETS
export interface Hero extends Omit<Headline, 'classes'>, Omit<Widget, 'isDark' | 'classes'> {
  content?: string;
  actions?: string | CallToAction[];
  image?: string | unknown;
}

export interface Team extends Omit<Headline, 'classes'>, Widget {
  team?: Array<TeamMember>;
}

export interface Stats extends Omit<Headline, 'classes'>, Widget {
  stats?: Array<Stat>;
}

export interface Pricing extends Omit<Headline, 'classes'>, Widget {
  prices?: Array<Price>;
}

export interface Testimonials extends Omit<Headline, 'classes'>, Widget {
  testimonials?: Array<Testimonial>;
  callToAction?: CallToAction;
}

export interface Brands extends Omit<Headline, 'classes'>, Widget {
  icons?: Array<string>;
  images?: Array<Image>;
}

export interface Features extends Omit<Headline, 'classes'>, Widget {
  image?: string | unknown;
  video?: Video;
  items?: Array<Item>;
  columns?: number;
  defaultIcon?: string;
  callToAction1?: CallToAction;
  callToAction2?: CallToAction;
  isReversed?: boolean;
  isBeforeContent?: boolean;
  isAfterContent?: boolean;
}

export interface Faqs extends Omit<Headline, 'classes'>, Widget {
  iconUp?: string;
  iconDown?: string;
  items?: Array<Item>;
  columns?: number;
}

export interface Steps extends Omit<Headline, 'classes'>, Widget {
  items?: Array<Item>;
  callToAction?: string | CallToAction;
  image?: string | Image;
  isReversed?: boolean;
}

export interface Content extends Omit<Headline, 'classes'>, Widget {
  content?: string;
  image?: string | unknown;
  items?: Array<Item>;
  columns?: number;
  isReversed?: boolean;
  isAfterContent?: boolean;
  callToAction?: CallToAction;
}

export interface Contact extends Omit<Headline, 'classes'>, Form, Widget {}

// BACKEND DOMAIN TYPES
export interface AgencyProfile {
  id: string;
  user_id: string;
  agency_id: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'manager' | 'member';
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClientRecord {
  id: string;
  agency_id: string;
  owner_id: string;
  company_name: string;
  primary_contact: string;
  email: string;
  phone: string | null;
  status: 'lead' | 'active' | 'inactive';
  services: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectRecord {
  id: string;
  agency_id: string;
  client_id: string;
  owner_id: string;
  name: string;
  status: 'discovery' | 'in_progress' | 'on_hold' | 'completed';
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  project_id: string;
  agency_id: string;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRecord {
  id: string;
  agency_id: string;
  client_id: string;
  project_id: string | null;
  owner_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issue_date: string;
  due_date: string;
  line_items: Array<{ description: string; quantity: number; unit_amount: number }>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  agency_id: string;
  owner_id: string;
  title: string;
  document_type: 'proposal' | 'contract' | 'brief' | 'report' | 'asset';
  status: 'draft' | 'sent' | 'signed' | 'archived';
  storage_path: string;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ActivityRecord {
  id: string;
  agency_id: string;
  actor_id: string;
  entity_type: 'client' | 'project' | 'task' | 'invoice' | 'document';
  entity_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at: string;
}

declare global {
  namespace App {
    interface Locals {
      user?: import('@supabase/supabase-js').User;
      accessToken?: string;
      supabase?: import('@supabase/supabase-js').SupabaseClient | null;
    }
  }
}
