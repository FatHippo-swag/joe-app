// Enhanced version of the Notes component with improved tab drag functionality
// src/pages/notes.tsx

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Notes.module.css';
import { Note } from '../types/Note';
import HomeIcon from '../components/HomeIcon';

export default function Notes() {
  // State for managing notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameNoteId, setRenameNoteId] = useState<string | null>(null);
  const [newNoteName, setNewNoteName] = useState('');
  const [dragType, setDragType] = useState<'vertical' | 'horizontal' | null>(null);
  
  // Refs for drag handling
  const dragStartY = useRef(0);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);
  const hasDragMoved = useRef(false); // New flag to track if drag has actually moved
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const dragOffsetY = useRef<{ [key: string]: number }>({});
  const MAX_DRAG_DISTANCE = 100;
  
  // Create a new note with current date as default name
  const createNewNote = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    const newNote: Note = {
      id: Date.now().toString(),
      name: formattedDate,
      content: '',
      createdAt: today,
      color: '#5f8bbf' // Default color
    };
    
    // Reset any dragged tabs before creating a new one
    if (draggedTabId) {
      resetTabPosition(draggedTabId);
    }
    
    setNotes(prevNotes => [...prevNotes, newNote]);
    setActiveNoteId(newNote.id);
  };
  
  // Handle note content change
  const handleNoteChange = (content: string) => {
    if (!activeNoteId) return;
    
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === activeNoteId ? { ...note, content } : note
      )
    );
  };
  
  // Handle note name change
  const handleNoteNameChange = (id: string, name: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === id ? { ...note, name } : note
      )
    );
  };
  
  // Handle tab color change
  const handleNoteColorChange = (id: string, color: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === id ? { ...note, color } : note
      )
    );
  };
  
  // Delete a note
  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    
    // Delete the drag offset for this tab
    if (dragOffsetY.current[id]) {
      delete dragOffsetY.current[id];
    }
    
    if (id === draggedTabId) {
      setDraggedTabId(null);
    }
    
    // If the active note is deleted, set the first note as active
    if (activeNoteId === id && notes.length > 1) {
      const remainingNotes = notes.filter(note => note.id !== id);
      setActiveNoteId(remainingNotes[0].id);
    } else if (notes.length === 1) {
      // If this was the last note, create a new one
      createNewNote();
    }
  };
  
  // Open rename modal
  const openRenameModal = (id: string) => {
    const note = notes.find(note => note.id === id);
    if (note) {
      setRenameNoteId(id);
      setNewNoteName(note.name);
      setShowRenameModal(true);
    }
  };
  
  // Close rename modal
  const closeRenameModal = () => {
    setShowRenameModal(false);
    setRenameNoteId(null);
    setNewNoteName('');
  };
  
  // Save rename
  const saveRename = () => {
    if (renameNoteId && newNoteName.trim()) {
      handleNoteNameChange(renameNoteId, newNoteName);
      closeRenameModal();
    }
  };
  
  // Reset tab position
  const resetTabPosition = (id: string) => {
    const tabElement = tabRefs.current[id];
    if (tabElement) {
      tabElement.style.transform = 'translateY(0)';
      tabElement.style.height = '40px';
      tabElement.style.zIndex = '';
      tabElement.classList.remove(styles.tabPartiallyExtended);
      tabElement.classList.remove(styles.tabFullyExtended);
      tabElement.classList.remove(styles.draggingTab);
      
      // Reset the stored offset
      dragOffsetY.current[id] = 0;
    }
    
    if (id === draggedTabId) {
      setDraggedTabId(null);
      setDragType(null);
    }
  };
  
  // Reset all tabs
  const resetAllTabs = () => {
    if (draggedTabId) {
      resetTabPosition(draggedTabId);
    }
  };
  
  // Update tab extension state based on drag distance
  const updateTabExtensionState = (id: string, dragDistance: number) => {
    const tabElement = tabRefs.current[id];
    if (!tabElement) return;
    
    // Remove all extension classes first
    tabElement.classList.remove(styles.tabPartiallyExtended);
    tabElement.classList.remove(styles.tabFullyExtended);
    
    // Add appropriate class based on drag distance
    if (dragDistance >= 40) {
      tabElement.classList.add(styles.tabFullyExtended);
    } else if (dragDistance > 10) {
      tabElement.classList.add(styles.tabPartiallyExtended);
    }
  };
  
  // Calculate tab positions for horizontal reordering
  const getTabPositions = () => {
    const positions: { id: string, left: number, width: number, index: number }[] = [];
    
    notes.forEach((note, index) => {
      const tabElement = tabRefs.current[note.id];
      if (tabElement) {
        const rect = tabElement.getBoundingClientRect();
        positions.push({
          id: note.id,
          left: rect.left,
          width: rect.width,
          index
        });
      }
    });
    
    return positions;
  };
  
  // Reorder tabs
  const reorderTabs = (fromId: string, toIndex: number) => {
    setNotes(prevNotes => {
      const fromIndex = prevNotes.findIndex(note => note.id === fromId);
      if (fromIndex === -1) return prevNotes;
      
      const reorderedNotes = [...prevNotes];
      const [movedNote] = reorderedNotes.splice(fromIndex, 1);
      reorderedNotes.splice(toIndex, 0, movedNote);
      
      return reorderedNotes;
    });
  };
  
  // Handle tab drag start
  const handleDragStart = (e: React.MouseEvent, id: string) => {
    // Skip if we're clicking on an interactive element inside the tab
    if ((e.target as HTMLElement).closest(`.${styles.tabOptionButton}`) || 
        (e.target as HTMLElement).closest(`.${styles.colorOption}`)) {
      return;
    }
    
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartX.current = e.clientX;
    isDragging.current = true;
    hasDragMoved.current = false; // Reset the movement flag
    
    // If we're clicking on a different tab than the dragged one, reset the current dragged tab
    if (draggedTabId && draggedTabId !== id) {
      resetTabPosition(draggedTabId);
    }
    
    // Set clicked tab as active immediately
    setActiveNoteId(id);
    
    // Only set as dragged tab if it's not already being dragged
    // This helps prevent the "needs second click" issue
    if (draggedTabId !== id) {
      setDraggedTabId(id);
      setDragType(null); // Initially not determined
      
      // Initialize the drag offset if it doesn't exist
      if (dragOffsetY.current[id] === undefined) {
        dragOffsetY.current[id] = 0;
      }
      
      // Add dragging class to the tab
      const tabElement = tabRefs.current[id];
      if (tabElement) {
        tabElement.classList.add(styles.draggingTab);
        tabElement.style.zIndex = '1000';
      }
    }
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  // Handle tab drag move
  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging.current || !draggedTabId) return;
    
    // Calculate deltas
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;
    
    // If movement is significant, mark that we've moved
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDragMoved.current = true;
    }
    
    // Determine drag type if not already set
    if (!dragType && hasDragMoved.current) {
      setDragType(Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical');
      return; // Wait for next frame to apply the determined drag type
    }
    
    const tabElement = tabRefs.current[draggedTabId];
    if (!tabElement) return;
    
    if (dragType === 'vertical') {
      // Vertical dragging for tab options
      // We want to drag upward, so we use negative deltaY
      const dragUpAmount = -deltaY;
      
      // Get the current offset
      let currentOffset = dragOffsetY.current[draggedTabId] || 0;
      
      // Calculate new drag distance by adding the new delta
      let newOffset = currentOffset + dragUpAmount;
      
      // Constrain drag distance to be between 0 and MAX_DRAG_DISTANCE
      newOffset = Math.min(Math.max(0, newOffset), MAX_DRAG_DISTANCE);
      
      // Update the tab position and height
      tabElement.style.transform = `translateY(-${newOffset}px)`;
      tabElement.style.height = `${40 + newOffset}px`;
      
      // Update extension state
      updateTabExtensionState(draggedTabId, newOffset);
      
      // Store the new offset
      dragOffsetY.current[draggedTabId] = newOffset;
      
      // Reset the drag start point to avoid accumulation
      dragStartY.current = e.clientY;
    } else if (dragType === 'horizontal') {
      // Horizontal dragging for tab reordering
      const tabPositions = getTabPositions();
      const currentIndex = tabPositions.findIndex(pos => pos.id === draggedTabId);
      if (currentIndex === -1) return;
      
      // Calculate the current position of the dragged tab
      const offsetX = e.clientX - dragStartX.current;
      const currentPosition = tabPositions[currentIndex].left + offsetX;
      
      // Move the tab visually
      tabElement.style.transform = `translateX(${offsetX}px)`;
      
      // Check if we should reorder
      for (let i = 0; i < tabPositions.length; i++) {
        if (i !== currentIndex) {
          const pos = tabPositions[i];
          const centerPoint = pos.left + (pos.width / 2);
          
          if ((i < currentIndex && currentPosition < centerPoint) ||
              (i > currentIndex && currentPosition > centerPoint)) {
            // Reorder the tabs
            reorderTabs(draggedTabId, i);
            // Reset drag start position to avoid jumps
            dragStartX.current = e.clientX;
            return;
          }
        }
      }
    }
  };
  
  // Handle tab drag end
  const handleDragEnd = () => {
    if (!draggedTabId) return;
    
    isDragging.current = false;
    
    // If there was no significant movement, treat it as a click
    if (!hasDragMoved.current) {
      // If tab is already extended, collapse it
      if (dragOffsetY.current[draggedTabId] > 0) {
        resetTabPosition(draggedTabId);
      }
    } else {
      // If horizontal dragging, reset the transform
      if (dragType === 'horizontal') {
        const tabElement = tabRefs.current[draggedTabId];
        if (tabElement) {
          tabElement.style.transform = 'translateY(0)';
          tabElement.style.zIndex = '';
        }
        setDraggedTabId(null);
        setDragType(null);
      }
    }
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };
  
  // Handle tab click
  const handleTabClick = (id: string) => {
    // Reset any previously dragged tab if clicking a different tab
    if (draggedTabId && draggedTabId !== id) {
      resetTabPosition(draggedTabId);
    }
    
    // Only set active if not dragging
    if (!isDragging.current) {
      setActiveNoteId(id);
    }
  };
  
  // Handle document click to reset tabs when clicking outside
  const handleDocumentClick = (e: MouseEvent) => {
    if (!draggedTabId) return;
    
    // Check if clicked outside tabs
    const clickedElement = e.target as HTMLElement;
    const isOutsideTabs = !clickedElement.closest(`.${styles.tab}`) && 
                          !clickedElement.closest(`.${styles.addTab}`) && 
                          !clickedElement.closest(`.${styles.tabOptions}`) && 
                          !clickedElement.closest(`.${styles.colorPicker}`);
    
    if (isOutsideTabs) {
      resetTabPosition(draggedTabId);
    }
  };
  
  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      try {
        const parsedNotes = JSON.parse(savedNotes);
        // Convert string dates back to Date objects
        const processedNotes = parsedNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt)
        }));
        setNotes(processedNotes);
        
        // Set the most recent note as active if available
        if (processedNotes.length > 0) {
          const mostRecentNote = [...processedNotes].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          setActiveNoteId(mostRecentNote.id);
        }
      } catch (error) {
        console.error('Error parsing saved notes:', error);
      }
    } else {
      // Create a default note if no notes exist
      createNewNote();
    }
    
    // Initialize dragOffsetY ref
    dragOffsetY.current = {};
    
    // Add document click handler to reset tabs when clicking outside
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);
  
  // Cleanup event listeners on component unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);
  
  // Save notes to localStorage whenever notes change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('notes', JSON.stringify(notes));
    }
  }, [notes]);
  
  // Find the active note
  const activeNote = notes.find(note => note.id === activeNoteId) || null;
  
  // Available colors for tabs
  const tabColors = ['#5f8bbf', '#7aa3d2', '#4a7ab0', '#3a5e8c', '#2c4a6f'];
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Notes</title>
        <meta name="description" content="Your notes" />
      </Head>
      
      <header className={styles.header}>
        <Link href="/" className={styles.homeLink}>
          <HomeIcon />
        </Link>
        <h1 className={styles.title}>Notes</h1>
      </header>
      
      <div className={styles.tabsContainer} ref={tabsContainerRef}>
        <div className={styles.tabs}>
          {notes.map(note => (
            <div 
              id={`tab-${note.id}`}
              key={note.id} 
              className={`${styles.tab} ${note.id === activeNoteId ? styles.activeTab : ''}`}
              onClick={() => handleTabClick(note.id)}
              onMouseDown={(e) => handleDragStart(e, note.id)}
              style={{ backgroundColor: note.color || '#5f8bbf' }}
              ref={el => tabRefs.current[note.id] = el}
            >
              <div className={styles.tabContent}>
                <div className={styles.tabName}>{note.name}</div>
                
                <div className={styles.tabOptions}>
                  <button 
                    className={styles.tabOptionButton} 
                    onClick={(e) => { e.stopPropagation(); openRenameModal(note.id); }}
                    title="Rename"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="white"/>
                    </svg>
                  </button>
                  
                  <button 
                    className={styles.tabOptionButton} 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    title="Delete"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="white"/>
                    </svg>
                  </button>
                </div>
                
                <div className={styles.colorPicker}>
                  {tabColors.map(color => (
                    <div
                      key={color}
                      className={`${styles.colorOption} ${note.color === color ? styles.selected : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={(e) => { e.stopPropagation(); handleNoteColorChange(note.id, color); }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
          <button 
            className={styles.addTab} 
            onClick={createNewNote}
          >
            <span>+</span>
          </button>
        </div>
      </div>
      
      <div className={styles.noteContent}>
        {activeNote && (
          <textarea
            value={activeNote.content}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="type here..."
            className={styles.noteTextarea}
          />
        )}
      </div>
      
      {showRenameModal && (
        <div className={styles.modal} onClick={closeRenameModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Rename Note</h2>
            <input
              type="text"
              value={newNoteName}
              onChange={(e) => setNewNoteName(e.target.value)}
              className={styles.modalInput}
              autoFocus
            />
            <div className={styles.modalButtons}>
              <button className={`${styles.modalButton} ${styles.cancelButton}`} onClick={closeRenameModal}>
                Cancel
              </button>
              <button className={`${styles.modalButton} ${styles.saveButton}`} onClick={saveRename}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}