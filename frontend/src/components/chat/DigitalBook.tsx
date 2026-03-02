import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BookPage {
    title?: string;
    content: React.ReactNode;
    image?: string;
    layout?: 'default' | 'editorial' | 'cover';
    subtitle?: string;
}

interface DigitalBookProps {
    pages: BookPage[];
}

export default function DigitalBook({ pages }: DigitalBookProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(0); // 1 for next, -1 for prev
    const [isAnimating, setIsAnimating] = useState(false);
    const [isHoveringRight, setIsHoveringRight] = useState(false);
    const [isHoveringLeft, setIsHoveringLeft] = useState(false);

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAnimating || currentPage >= pages.length - 1) return;
        setDirection(1);
        setCurrentPage((prev) => prev + 1);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAnimating || currentPage <= 0) return;
        setDirection(-1);
        setCurrentPage((prev) => prev - 1);
    };

    // Calculate the "next" page to show underneath
    const nextPageIdx = direction > 0
        ? Math.min(currentPage, pages.length - 1)
        : Math.max(currentPage, 0);

    const prevPageIdx = direction > 0
        ? Math.max(currentPage - 1, 0)
        : Math.min(currentPage + 1, pages.length - 1);

    return (
        <div className="premium-book-viewport">
            <div className="premium-book-container">
                <div className="premium-book-ambient-shadow" />

                <div className="premium-book-wrapper">
                    {/* Fixed Spiral Spine - Always visible on the left side */}
                    <div className="book-spiral-spine">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="spiral-loop" />
                        ))}
                    </div>

                    {/* Content Anchor for the pages */}
                    <div className="book-content-anchor">
                        {/* Under Layer (The page being revealed) */}
                        <div className="page-layer under">
                            <PageContent page={pages[currentPage]} pageNumber={currentPage + 1} />
                        </div>

                        {/* Turning Layer (Animated) */}
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={prevPageIdx}
                                custom={direction}
                                className="page-layer active"
                                initial={{ rotateY: 0, x: 0, opacity: 1 }}
                                animate={{
                                    rotateY: direction > 0 ? -110 : 110,
                                    x: direction > 0 ? -20 : 20,
                                    opacity: 0,
                                    skewY: direction > 0 ? -5 : 5,
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 0.9,
                                    ease: [0.645, 0.045, 0.355, 1.0],
                                }}
                                onAnimationStart={() => setIsAnimating(true)}
                                onAnimationComplete={() => setIsAnimating(false)}
                                style={{ transformOrigin: 'left center' }}
                            >
                                <PageContent page={pages[prevPageIdx]} pageNumber={prevPageIdx + 1} isTurning />
                            </motion.div>
                        </AnimatePresence>

                        {/* Hover Preview Effects */}
                        {!isAnimating && (
                            <div className="page-layer active" style={{ pointerEvents: 'none' }}>
                                <motion.div
                                    animate={{
                                        rotateY: isHoveringRight ? -5 : (isHoveringLeft ? 5 : 0),
                                        x: isHoveringRight ? -2 : (isHoveringLeft ? 2 : 0)
                                    }}
                                    className="w-full h-full"
                                    style={{ transformOrigin: 'left center' }}
                                >
                                    <div className="premium-page-paper" style={{ boxShadow: 'none', background: 'transparent', border: 'none' }}>
                                        {/* This is just a visual shell for the hover lift */}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Overlays */}
                <div className="premium-nav-overlay">
                    <div
                        className={`nav-zone left-zone ${currentPage === 0 ? 'disabled' : ''}`}
                        onClick={handlePrev}
                        onMouseEnter={() => setIsHoveringLeft(true)}
                        onMouseLeave={() => setIsHoveringLeft(false)}
                    />
                    <div
                        className={`nav-zone right-zone ${currentPage === pages.length - 1 ? 'disabled' : ''}`}
                        onClick={handleNext}
                        onMouseEnter={() => setIsHoveringRight(true)}
                        onMouseLeave={() => setIsHoveringRight(false)}
                    />
                </div>
            </div>
        </div>
    );
}

function PageContent({ page, pageNumber, isTurning = false }: { page: BookPage; pageNumber: number; isTurning?: boolean }) {
    if (!page) return null;

    const renderLayout = () => {
        if (page.layout === 'cover') {
            return (
                <div className="page-cover">
                    <h1 className="cover-title">{page.title}</h1>
                    <div className="cover-divider" />
                    {page.subtitle && <p className="cover-subtitle">{page.subtitle}</p>}
                </div>
            );
        }

        if (page.layout === 'editorial') {
            return (
                <div className="overview-editorial-grid">
                    <div className="editorial-text-side">
                        {page.title && <h2 className="premium-page-title">{page.title}</h2>}
                        <div className="premium-page-body">
                            {page.content}
                        </div>
                    </div>
                    <div className="editorial-image-side">
                        {page.image && <img src={page.image} alt="SVIT Overview" />}
                    </div>
                </div>
            );
        }

        return (
            <div className="premium-page-inner">
                {page.title && <h2 className="premium-page-title">{page.title}</h2>}
                <div className="premium-page-body">
                    {page.content}
                </div>
                {page.image && (
                    <div className="premium-image-wrapper">
                        <img src={page.image} alt="Visual" className="premium-page-image" />
                    </div>
                )}
                <div className="premium-page-footer">
                    <span className="premium-page-number">
                        {String(pageNumber).padStart(2, '0')}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="premium-page-paper">
            <div className="paper-texture" />
            {isTurning && <div className="page-curl-overlay" style={{ opacity: 1 }} />}
            {renderLayout()}
        </div>
    );
}
