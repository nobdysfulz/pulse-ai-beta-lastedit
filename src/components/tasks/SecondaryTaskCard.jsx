import React, { useState } from 'react';
import PriorityTaskCard from './PriorityTaskCard';

/**
 * SecondaryTaskCard is now just a wrapper around PriorityTaskCard
 * but defaults to collapsed state to match the "Compact list view" requirement.
 * When clicked, it expands to show full details.
 */
export default function SecondaryTaskCard(props) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <PriorityTaskCard 
            {...props} 
            isExpanded={isExpanded} 
            toggleExpand={() => setIsExpanded(!isExpanded)} 
        />
    );
}