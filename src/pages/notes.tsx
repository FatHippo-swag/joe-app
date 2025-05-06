// src/pages/notes.tsx with fixed delete function
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Notes.module.css';
import { Note } from '../types/Note';
import HomeIcon from '../components/HomeIcon';
import SimpleRichTextEditor from '../components/SimpleRichTextEditor';

export default function Notes() {
  // State for managing notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameNoteId, setRenameNoteId] = useState<string | null>(null);
  const [newNoteName, setNewNoteName] = useState('');
  const [dragType, setDragType] = useState<'horizontal' | null>(null);
  
  // Refs for drag handling
  const dragStartX = useRef(0);
  const isDragging = useRef(false);
  const hasDragMoved = useRef(false);
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const lastClickTime = useRef(0); // Track time between clicks for detecting double clicks
  // Drag threshold
  const dragThreshold = 5; // Small threshold for detecting horizontal drag movement
  const MAX_TAB_EXTEND = 100; // Maximum tab extension for options display
  
  // Create a new note with current date as default name
  const createNewNote = useCallback(() => {
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
    
    // Reset any extended tabs before creating a new one
    if (draggedTabId) {
      resetTabPosition(draggedTabId);
    }
    
    setNotes(prevNotes => [...prevNotes, newNote]);
    setActiveNoteId(newNote.id);
  }, [draggedTabId]);
  
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
  
  // Delete a note - ENHANCED FIXED FUNCTION
  const deleteNote = (id: string) => {
    console.log(`Deleting note with ID: ${id}`);
    
    // Save current state before modification
    const currentNotes = [...notes];
    const isLastNote = currentNotes.length <= 1;
    const isActiveNote = activeNoteId === id;
    
    // Find the index of the note to be deleted
    const noteIndex = currentNotes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      console.error("Note not found, cannot delete");
      return;
    }
    
    // Create a new array without the deleted note
    const updatedNotes = currentNotes.filter(note => note.id !== id);
    
    // Update the notes state
    setNotes(updatedNotes);
    
    // Directly update localStorage to ensure changes are persisted immediately
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    
    // Clean up any related data
    if (id === draggedTabId) {
      setDraggedTabId(null);
      setDragType(null);
    }
    
    // Handle active note selection
    if (isActiveNote) {
      if (updatedNotes.length > 0) {
        // Set the next note as active, or the previous if this was the last note
        const newActiveIndex = Math.min(noteIndex, updatedNotes.length - 1);
        setActiveNoteId(updatedNotes[newActiveIndex].id);
      } else {
        setActiveNoteId(null);
      }
    }
    
    // If this was the last or only note, create a new one
    if (isLastNote) {
      console.log("Last note deleted, creating a new one");
      // Use setTimeout to ensure state updates have processed
      setTimeout(() => {
        createNewNote();
      }, 50);
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
      tabElement.classList.remove(styles.horizontalDrag);
    }
    
    if (id === draggedTabId) {
      setDraggedTabId(null);
      setDragType(null);
    }
  };
  
  // Toggle tab extension on double click
  const handleTabDoubleClick = (id: string, e: React.MouseEvent) => {
    // Skip if we're clicking on an interactive element inside the tab
    if ((e.target as HTMLElement).closest(`.${styles.tabOptionButton}`) || 
        (e.target as HTMLElement).closest(`.${styles.colorOption}`)) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Get the current tab element
    const tabElement = tabRefs.current[id];
    if (!tabElement) return;
    
    // Check if this tab is already extended
    const isAlreadyExtended = tabElement.classList.contains(styles.tabFullyExtended);
    
    // Reset any currently extended tab
    if (draggedTabId) {
      resetTabPosition(draggedTabId);
    }
    
    // If clicking the same tab that was extended, just close it
    if (isAlreadyExtended && id === draggedTabId) {
      return; // The tab was reset above
    }
    
    // Otherwise, extend the clicked tab
    setDraggedTabId(id);
    tabElement.classList.add(styles.draggingTab);
    tabElement.style.zIndex = '1000';
    tabElement.style.transform = `translateY(-${MAX_TAB_EXTEND}px)`;
    tabElement.style.height = `${40 + MAX_TAB_EXTEND}px`;
    tabElement.classList.add(styles.tabFullyExtended);
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
  
  // Handle tab drag start - now only for horizontal reordering
  const handleDragStart = (e: React.MouseEvent, id: string) => {
    // Skip if we're clicking on an interactive element inside the tab
    if ((e.target as HTMLElement).closest(`.${styles.tabOptionButton}`) || 
        (e.target as HTMLElement).closest(`.${styles.colorOption}`)) {
      return;
    }
    
    e.preventDefault();
    
    // Check for double click
    const now = Date.now();
    if (now - lastClickTime.current < 300 && lastClickTime.current !== 0) {
      // Handle as double click
      handleTabDoubleClick(id, e);
      lastClickTime.current = 0; // Reset to prevent triple click detection
      return;
    }
    lastClickTime.current = now;
    
    // Set clicked tab as active immediately
    setActiveNoteId(id);
    
    // If an extended tab is clicked, just reset it and treat as a normal click
    const tabElement = tabRefs.current[id];
    if (tabElement && (tabElement.classList.contains(styles.tabPartiallyExtended) || 
                       tabElement.classList.contains(styles.tabFullyExtended))) {
      resetTabPosition(id);
      return;
    }
    
    // Set up for horizontal drag
    dragStartX.current = e.clientX;
    isDragging.current = true;
    hasDragMoved.current = false;
    
    // If we're clicking on a different tab than the dragged one, reset the current dragged tab
    if (draggedTabId && draggedTabId !== id) {
      resetTabPosition(draggedTabId);
    }
    
    // Set as dragged tab
    setDraggedTabId(id);
    setDragType('horizontal');
    
    // Add dragging class to the tab
    if (tabElement) {
      tabElement.classList.add(styles.draggingTab);
      tabElement.classList.add(styles.horizontalDrag);
      tabElement.style.zIndex = '1000';
    }
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  // Handle tab drag move - now only for horizontal reordering
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !draggedTabId || dragType !== 'horizontal') return;
    
    // Calculate delta
    const deltaX = e.clientX - dragStartX.current;
    
    // Check if we've moved beyond threshold
    if (Math.abs(deltaX) > dragThreshold) {
      hasDragMoved.current = true;
      
      // Move the tab visually
      const tabElement = tabRefs.current[draggedTabId];
      if (tabElement) {
        tabElement.style.transform = `translateX(${deltaX}px)`;
      }
      
      // Check if we should reorder
      const tabPositions = getTabPositions();
      const currentIndex = tabPositions.findIndex(pos => pos.id === draggedTabId);
      if (currentIndex === -1) return;
      
      // Calculate the current position of the dragged tab
      const currentPosition = tabPositions[currentIndex].left + deltaX;
      
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
  }, [dragType, draggedTabId, dragThreshold]);
  
  // Handle tab drag end
  const handleDragEnd = useCallback(() => {
    if (!draggedTabId) return;
    
    isDragging.current = false;
    
    // If there was no significant movement, treat it as a click
    if (!hasDragMoved.current) {
      // Simply make the tab active, but don't change its state
      setActiveNoteId(draggedTabId);
    } else if (dragType === 'horizontal') {
      // For horizontal drags, reset the transform properly
      const tabElement = tabRefs.current[draggedTabId];
      if (tabElement) {
        // Add a snap animation class for smoother transitions
        tabElement.classList.add(styles.tabSnapping);
        
        // Reset position and styles
        tabElement.style.transform = 'translateX(0)';
        tabElement.style.zIndex = '';
        
        // Remove animation class after transition
        setTimeout(() => {
          if (tabElement) {
            tabElement.classList.remove(styles.tabSnapping);
            tabElement.classList.remove(styles.draggingTab);
            tabElement.classList.remove(styles.horizontalDrag);
          }
        }, 200);
      }
      setDraggedTabId(null);
      setDragType(null);
    }
    
    hasDragMoved.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [draggedTabId, dragType]);
  
  // Handle tab click
  const handleTabClick = (id: string) => {
    // Set active immediately
    setActiveNoteId(id);
  };
  
  // Handle document click to reset tabs when clicking outside
  const handleDocumentClick = useCallback((e: MouseEvent) => {
    if (!draggedTabId) return;
    
    // Check if clicked outside tabs
    const clickedElement = e.target as HTMLElement;
    const isOutsideTabs = !clickedElement.closest(`.${styles.tab}`) && 
                          !clickedElement.closest(`.${styles.addTab}`) && 
                          !clickedElement.closest(`.${styles.tabOptions}`) && 
                          !clickedElement.closest(`.${styles.colorPicker}`) &&
                          !clickedElement.closest(`.${styles.modalContent}`);
    
    if (isOutsideTabs) {
      resetTabPosition(draggedTabId);
    }
  }, [draggedTabId]);
  
  // Load notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      try {
        const parsedNotes = JSON.parse(savedNotes);
        // Convert string dates back to Date objects
        const processedNotes = parsedNotes.map((note: { id: string; name: string; content: string; createdAt: string; color?: string }) => ({
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
    
    // Add document click handler to reset tabs when clicking outside
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [createNewNote, handleDocumentClick]);
  
  // Cleanup event listeners on component unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [handleDragMove, handleDragEnd, handleDocumentClick]);
  
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
          {notes.map((note, index) => (
            <div 
              id={`tab-${note.id}`}
              key={`tab-${note.id}-${index}`} // Add index to ensure proper re-rendering
              className={`${styles.tab} ${note.id === activeNoteId ? styles.activeTab : ''}`}
              onClick={() => handleTabClick(note.id)}
              onMouseDown={(e) => handleDragStart(e, note.id)}
              style={{ backgroundColor: note.color || '#5f8bbf' }}
              ref={el => { tabRefs.current[note.id] = el; }}
            >
              <div className={styles.tabContent}>
                <div className={styles.tabName}>{note.name}</div>
                
                <div className={styles.tabOptions}>
                  <button 
                    className={styles.tabOptionButton} 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openRenameModal(note.id);
                    }}
                    title="Rename"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="white"/>
                    </svg>
                  </button>
                  
                  {/* FIXED DELETE BUTTON */}
                  <button 
                    className={styles.tabOptionButton} 
                    onClick={(e) => {
                      // Prevent any parent event handlers from firing
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Use setTimeout to ensure this executes after the click event is fully processed
                      setTimeout(() => {
                        // Call delete function
                        deleteNote(note.id);
                      }, 10);
                    }}
                    title="Delete"
                    type="button"
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
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        handleNoteColorChange(note.id, color); 
                      }}
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
          <SimpleRichTextEditor
            value={activeNote.content}
            onChange={handleNoteChange}
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