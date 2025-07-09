'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid, List, Copy, ExternalLink, ChevronDown, ChevronUp, Users, Calendar, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useLastUpdated } from '@/components/LastUpdatedContext';


interface Author {
  name: string;
  type: 'internal' | 'external' | 'alumni' | any;
}


const internalList = ['Das, Swagatam', 'Swagatam Das', 'Das, S.', 
                      'Chakrabarty, Anish', 'Anish Chakrabarty', 'Chakrabarty, A.',
                      'Ansari, Faizanuddin', 'Faizanuddin Ansari', 'Ansari, F.',
                      'Bose, Kushal', 'Kushal Bose' , 'Bose, K.',
                      'Ojha, Indronil', 'Indronil Ojha', 'Ojha, I.',
                      'Mondal, Priyobrata', 'Priyobrata Mondal', 'Mondal, P.',
                      'Pratihar, Arghya', 'Arghya Pratihar', 'Pratihar, A.',
                      'Pramanik, Bhaskar', 'Bhaskar Pramanik', 'Pramanik, B.',
                      'Mandal, Aniruddha', 'Aniruddha Mandal', 'Mandal, A.',
                      'Dutta, Debanjan', 'Debanjan Dutta', 'Dutta, D.',
                      'Chakraborty, Shinjon', 'Shinjon Chakraborty', 'Chakraborty, S.',
                      'Mukherjee, Pritam', 'Pritam Mukherjee', 'Mukherjee, P.',
                     ];
const alumniList   = ['Ghosh, Susmita', 'Susmita Ghosh', 'Ghosh, S.',
                      'Gupta, Avisek', 'Avisek Gupta', 'Gupta, A.',
                      'Basu, Arkaprabha', 'Arkaprabha Basu', 'Basu, A.',
                      'Chowdhury, Anal Roy', 'Anal Roy Chowdhury', 'Chowdhury, A. R.',
                      'Mullick, Sankha Subhra', 'Sankha Subhra Mullick', 'Mullick, S. S.',
                      'Dhar, Sandipan', 'Sandipan Dhar', 'Dhar, S.',
                      'Datta, Shounak', 'Shounak Datta', 'Datta, S.',
                      'Chowdhury, Anal Roy', 'Anal Roy Chowdhury', 'Chowdhury A. R.',
                      'Basu, Arkaprabha', 'Arkaprabha Basu', 'Basu, A.',
                     ];

interface Publication {
  id: string;
  title: string;
  authors: Author[];
  journal: string;
  booktitle: string;
  year: number;
  jctype: 'journal' | 'conference';
  abstract?: string;
  keywords: string[];
  doi?: string;
  url?: string;
  featured?: boolean;
  bibtex: string;
}

function parseAuthorField(raw: string): Author[] {
  return raw.split(' and ').map(entry => {
    const name = entry.trim();

    let type: Author['type'] = 'external'; // default fallback

    if (internalList.includes(name)) type = 'internal';
    else if (alumniList.includes(name)) type = 'alumni';
    //else if (externalList.includes(name)) type = 'external';

    return { name, type };
  });
}

function parseBool(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const val = value.toLowerCase().trim();
    return val === 'true' || val === '1';
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
}

function toBibTeX(entry: Record<string, any>): string {
  let { id, type, raw, jctype, ...fields } = entry;
  
  if (jctype === 'conference') {
    type = 'inproceedings';
  }

  const exclude = new Set(['jctype', 'keywords', 'abstract']);

  const sanitizedFields: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (exclude.has(key)) continue;

    sanitizedFields[key] = value;
  }

  const fieldLines = Object.entries(sanitizedFields)
    .map(([key, value]) => key === 'title'
      ? `  ${key} = "{${value}}"`
      : `  ${key} = {${value}}`
    )
    .join(',\n');

  return `@${type}{${id},\n${fieldLines}\n}`;
}




function parseKeywords(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

export default function ClientComponent({ fileData }: { fileData: any[] }) {
    
    const { setLastUpdated } = useLastUpdated();
  
    useEffect(() => {
      setLastUpdated('2025-06-17');
    }, [setLastUpdated]);
    // const publications: Array<Record<string, any>> = JSON.parse(fileData);
    const publicationsjson = fileData;
    const publications: Publication[] = publicationsjson.map((pub: any) => ({
        id: pub.id,
        year: parseInt(pub.year),
        authors: parseAuthorField(pub.author),
        title: pub.title,
        keywords: parseKeywords(pub.keywords),
        jctype: pub.jctype,
        abstract: pub.abstract ?? undefined, // ⬅️ keeps it optional
        featured: parseBool(pub.featured) ?? undefined,
        bibtex: toBibTeX(pub),
        doi: pub.doi ?? undefined,
        url: pub.url ?? undefined,
        journal: pub.journal,
        booktitle: pub.booktitle,
    }));
  const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<'all' | 'journal' | 'conference'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());
    const [showCitation, setShowCitation] = useState<string | null>(null);
  
    const filteredPublications = publications.filter(pub => {
      const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pub.authors.some(author => author.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           pub.keywords.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = selectedType === 'all' || pub.jctype === selectedType;
      return matchesSearch && matchesType;
    });
  
    const toggleAbstract = (id: string) => {
      const newExpanded = new Set(expandedAbstracts);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setExpandedAbstracts(newExpanded);
    };
  
    const generateCitation = (pub: Publication) => {
    //   const authorNames = pub.authors.map(a => a.name).join(', ');
    //   return `${authorNames}. "${pub.title}." ${pub.journal}, ${pub.year}.`;
    return pub.bibtex;
    };
  
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
    };
  
    const getAuthorTypeColor = (type: Author['type']) => {
      switch (type) {
        case 'internal': return 'internal-author';
        case 'external': return 'external-author';
        case 'alumni': return 'alumni-author';
        default: return '';
      }
    };
  
    const CollaborationAvatarGroup = ({ authors }: { authors: Author[] }) => {
        const [hoveredAuthor, setHoveredAuthor] = useState<number | null>(null);
        const [clickedAuthor, setClickedAuthor] = useState<number | null>(null);

        const handleAuthorClick = (index: number) => {
          setClickedAuthor(clickedAuthor === index ? null : index);
        };

        return (
          <div className="flex -space-x-2 mb-4 relative">
            {authors.map((author, index) => (
              <div key={index} className="relative">
                <div
                  className={`collaboration-avatar w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold ${getAuthorTypeColor(author.type)} relative cursor-pointer`}
                  onMouseEnter={() => setHoveredAuthor(index)}
                  onMouseLeave={() => setHoveredAuthor(null)}
                  onClick={() => handleAuthorClick(index)}
                >
                  {author.name.split(' ').map(n => n[0]).reverse().join('').slice(0, 2)}
                </div>
                
                {/* Custom Tooltip */}
                <AnimatePresence>
                  {(hoveredAuthor === index || clickedAuthor === index) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-md whitespace-nowrap z-50 shadow-lg"
                    >
                      <div className="font-medium">{author.name.split(',').reverse().join(' ')}</div>
                      <div className="text-xs opacity-75 capitalize">({author.type})</div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        );
      };  
    const PublicationCard = ({ publication }: { publication: Publication }) => {
      const isExpanded = expandedAbstracts.has(publication.id);
      const abstractWords = publication.abstract?.split(' ') || [];
      const shortAbstract = abstractWords.slice(0, 25).join(' ');
      const remainingAbstract = abstractWords.slice(25).join(' ');

  
      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="research-card p-6 rounded-2xl"
        >
          {publication.featured && (
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Featured Publication
              </span>
            </div>
          )}
  
          <h3 className="text-xl font-bold mb-3 text-gray-500 dark:text-gray-200 leading-tight">
            {publication.title}
          </h3>
  
          <CollaborationAvatarGroup authors={publication.authors} />
  
          <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{publication.authors.length} authors</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{publication.year}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              publication.jctype === 'journal' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {publication.jctype}
            </span>
          </div>
          
          {/***************   Without math support **********************/}
          {/*{publication.abstract && (
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {shortAbstract}
                {abstractWords.length > 25 && (
                  <>
                    {isExpanded && (
                      <span> {remainingAbstract}</span>
                    )}
                    <button
                      onClick={() => toggleAbstract(publication.id)}
                      className="ml-2 text-blue-500 hover:text-blue-600 font-medium inline-flex items-center"
                    >
                      {isExpanded ? (
                        <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                      ) : (
                        <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
                      )}
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
          */}
          
          {publication.abstract && (
          <div className="mb-4">
            <div className="text-gray-600 dark:text-gray-400 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => <p className="mb-2">{children}</p>,
                }}
              >
                {isExpanded ? publication.abstract : shortAbstract}
              </ReactMarkdown>
            </div>
            {abstractWords.length > 25 && (
              <button
                onClick={() => toggleAbstract(publication.id)}
                className="mt-2 text-blue-500 hover:text-blue-600 font-medium inline-flex items-center"
              >
                {isExpanded ? (
                  <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </button>
            )}
          </div>
        )}
  
          <div className="flex flex-wrap gap-2 mb-6">
            {publication.keywords.map((keyword) => (
              <span
                key={keyword}
                className="research-tag px-3 py-1 rounded-full text-sm font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
  
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {(publication.journal || publication.booktitle)}
            </div>
            
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCitation(publication.id)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cite
              </motion.button>
              
              {(publication.doi || publication.url) && (
                <motion.a
                  href={publication.doi ? `https://doi.org/${publication.doi}` : publication.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center space-x-1"
                >
                  <span>View</span>
                  <ExternalLink className="w-3 h-3" />
                </motion.a>
              )}
            </div>
          </div>
        </motion.div>
      );
    };
  
    return (
      <div className="min-h-screen pt-20">
        {/* Hero Section */}
        <section className="py-20 gradient-bg">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gradient">
                Publications
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Explore our cutting-edge research contributions to machine learning, deep learning, and high-dimensional statistics
              </p>
            </motion.div>
          </div>
        </section>
  
        {/* Filters and Search */}
        <section className="py-8 bg-white dark:bg-gray-900 sticky top-16 z-30 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search publications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
  
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="journal">Journal</option>
                    <option value="conference">Conference</option>
                  </select>
                </div>
  
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white dark:bg-gray-700 text-blue-500 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
  
        {/* Publications Grid */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="mb-8">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {filteredPublications.length} of {publications.length} publications
              </p>
            </div>
  
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={viewMode === 'grid' ? 'publication-grid' : 'space-y-6'}
              >
                {filteredPublications.map((publication) => (
                  <PublicationCard key={publication.id} publication={publication} />
                ))}
              </motion.div>
            </AnimatePresence>
  
            {filteredPublications.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <p className="text-xl text-gray-500 dark:text-gray-400">
                  No publications found matching your criteria.
                </p>
              </motion.div>
            )}
          </div>
        </section>
  
        {/* Citation Modal */}
        <AnimatePresence>
          {showCitation && (
            <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCitation(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
              >
                <div className="citation-popup rounded-2xl p-6 overflow-y-auto max-h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      Citation
                    </h3>
                    <button
                      onClick={() => setShowCitation(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  
                  {(() => {
                    const pub = publications.find(p => p.id === showCitation);
                    if (!pub) return null;
                    const citation = generateCitation(pub);
                    
                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-x-auto">
                          <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words font-mono text-sm">
                            {citation}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => copyToClipboard(citation)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copy Citation</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </motion.div>
          </>
          )}
        </AnimatePresence>
      </div>
    );
  }
