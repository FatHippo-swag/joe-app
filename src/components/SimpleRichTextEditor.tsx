import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import styles from '../styles/SimpleRichTextEditor.module.css';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  
  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current) {
      // Only update if content is different to prevent cursor jumping
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // Function to save content changes
  const handleContentChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };
  
  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key for line breaks
    if (e.key === 'Enter') {
      // Get the current selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // Check if we're inside a task item
        if (parentElement && parentElement.closest(`.${styles.taskItem}`)) {
          e.preventDefault();
          
          // Create a new task item
          const taskItem = document.createElement('div');
          taskItem.className = styles.taskItem;
          
          // Create checkbox
          const checkbox = document.createElement('span');
          checkbox.className = styles.checkbox;
          checkbox.innerHTML = '☐';
          checkbox.contentEditable = 'false';
          checkbox.addEventListener('click', (clickEvent) => {
            const target = clickEvent.target as HTMLElement;
            if (target.innerHTML === '☐') {
              target.innerHTML = '☑';
              target.nextElementSibling?.classList.add(styles.taskCompleted);
            } else {
              target.innerHTML = '☐';
              target.nextElementSibling?.classList.remove(styles.taskCompleted);
            }
            handleContentChange();
          });
          
          // Create task text
          const taskText = document.createElement('span');
          taskText.className = styles.taskText;
          taskText.innerHTML = '&nbsp;'; // Add a non-breaking space
          
          // Add checkbox and text to task item
          taskItem.appendChild(checkbox);
          taskItem.appendChild(taskText);
          
          // Insert after the current task item
          const currentTaskItem = parentElement.closest(`.${styles.taskItem}`);
          if (currentTaskItem && currentTaskItem.parentNode) {
            currentTaskItem.parentNode.insertBefore(taskItem, currentTaskItem.nextSibling);
            
            // Move cursor to the new task item
            const newRange = document.createRange();
            newRange.selectNodeContents(taskText);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            
            handleContentChange();
          }
          return;
        }
      }
    }
    
    // Handle Backspace for task items
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.parentElement;
        
        // Check if we're at the beginning of a task item's text and there's nothing else
        if (parentElement && 
            parentElement.classList.contains(styles.taskText) && 
            selection.isCollapsed && 
            range.startOffset === 0 && 
            (!parentElement.textContent || parentElement.textContent.trim() === '')) {
          e.preventDefault();
          
          // Find and remove the entire task item
          const taskItem = parentElement.closest(`.${styles.taskItem}`);
          if (taskItem && taskItem.parentNode) {
            // Get the previous element to move cursor there
            const previousElement = taskItem.previousElementSibling;
            
            // Remove the task item
            taskItem.parentNode.removeChild(taskItem);
            
            // If there's a previous element, move cursor to its end
            if (previousElement) {
              const newRange = document.createRange();
              let textNode = previousElement;
              
              // If it's a task item, select the text span
              if (previousElement.classList.contains(styles.taskItem)) {
                const textSpan = previousElement.querySelector(`.${styles.taskText}`);
                if (textSpan) {
                  textNode = textSpan;
                }
              }
              
              newRange.selectNodeContents(textNode);
              newRange.collapse(false); // Move to the end
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
            
            handleContentChange();
          }
        }
      }
    }
  };

  // Toggle bold formatting - uses More Sugar Regular font
  const toggleBold = () => {
    if (editorRef.current) {
      // Get selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Check if selection is within the editor
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          const selectedText = range.toString();
          
          if (selectedText) {
            // Create span with bold class
            const span = document.createElement('span');
            span.className = styles.bold;
            
            // Replace selected text with span
            range.deleteContents();
            span.appendChild(document.createTextNode(selectedText));
            range.insertNode(span);
            
            // Update bold state
            setIsBold(!isBold);
            
            // Save changes
            handleContentChange();
          }
        }
      }
    }
  };

  // Add a heading
  const addHeading = (level: number) => {
    if (editorRef.current) {
      document.execCommand('formatBlock', false, `h${level}`);
      
      // Apply custom class to heading
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const heading = range.commonAncestorContainer.parentElement;
        
        if (heading && /^H[1-6]$/.test(heading.tagName)) {
          heading.className = styles[`heading${level}`];
        }
      }
      
      handleContentChange();
    }
  };

  // Change text size
  const changeTextSize = (size: string) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          const selectedText = range.toString();
          
          if (selectedText) {
            // Create span with size class
            const span = document.createElement('span');
            span.className = styles[size];
            
            // Replace selected text with span
            range.deleteContents();
            span.appendChild(document.createTextNode(selectedText));
            range.insertNode(span);
            
            // Save changes
            handleContentChange();
          }
        }
      }
      
      // Hide size menu
      setShowSizeMenu(false);
    }
  };

  // Add bullet list
  const addBulletList = () => {
    if (editorRef.current) {
      document.execCommand('insertUnorderedList', false);
      
      // Apply custom class to list
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const listItem = range.commonAncestorContainer.parentElement;
        
        if (listItem && listItem.tagName === 'LI') {
          const list = listItem.parentElement;
          if (list) {
            list.className = styles.bulletList;
          }
        }
      }
      
      handleContentChange();
    }
  };
  
  // Add task item
  const addTaskItem = () => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          // Check if we're already inside a task item
          const currentTaskItem = range.commonAncestorContainer.parentElement?.closest(`.${styles.taskItem}`);
          if (currentTaskItem) {
            // If we're inside a task item, create a new one after it
            const newTaskItem = document.createElement('div');
            newTaskItem.className = styles.taskItem;
            
            const checkbox = document.createElement('span');
            checkbox.className = styles.checkbox;
            checkbox.innerHTML = '☐';
            checkbox.contentEditable = 'false';
            checkbox.addEventListener('click', toggleTaskCheckbox);
            
            const taskText = document.createElement('span');
            taskText.className = styles.taskText;
            taskText.innerHTML = '&nbsp;'; // Add a non-breaking space
            
            newTaskItem.appendChild(checkbox);
            newTaskItem.appendChild(taskText);
            
            // Insert after the current task item
            if (currentTaskItem.parentNode) {
              currentTaskItem.parentNode.insertBefore(newTaskItem, currentTaskItem.nextSibling);
              
              // Move cursor to the new task text
              const newRange = document.createRange();
              newRange.selectNodeContents(taskText);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            // Create a new task item at current position
            const taskItem = document.createElement('div');
            taskItem.className = styles.taskItem;
            
            // Create checkbox
            const checkbox = document.createElement('span');
            checkbox.className = styles.checkbox;
            checkbox.innerHTML = '☐';
            checkbox.contentEditable = 'false';
            checkbox.addEventListener('click', toggleTaskCheckbox);
            
            // Create task text
            const taskText = document.createElement('span');
            taskText.className = styles.taskText;
            
            // Get selected text or use placeholder
            const selectedText = range.toString() || '';
            if (selectedText) {
              taskText.appendChild(document.createTextNode(selectedText));
            } else {
              taskText.innerHTML = '&nbsp;'; // Add a non-breaking space
            }
            
            // Add checkbox and text to task item
            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskText);
            
            // Insert task item
            range.deleteContents();
            range.insertNode(taskItem);
            
            // Add a line break after the task item if it's not at the end
            const br = document.createElement('br');
            if (taskItem.nextSibling) {
              taskItem.parentNode?.insertBefore(br, taskItem.nextSibling);
            } else {
              taskItem.parentNode?.appendChild(br);
            }
            
            // Move cursor to end of task text
            const newRange = document.createRange();
            newRange.selectNodeContents(taskText);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
          
          handleContentChange();
        }
      }
    }
  };
  
  // Helper function for toggling task checkboxes
  const toggleTaskCheckbox = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.innerHTML === '☐') {
      target.innerHTML = '☑';
      target.nextElementSibling?.classList.add(styles.taskCompleted);
    } else {
      target.innerHTML = '☐';
      target.nextElementSibling?.classList.remove(styles.taskCompleted);
    }
    handleContentChange();
  };

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <button 
          className={`${styles.toolbarButton} ${isBold ? styles.active : ''}`}
          onClick={toggleBold}
          title="Bold (More Sugar Regular)"
        >
          B
        </button>
        
        <span className={styles.divider}></span>
        
        <div className={styles.dropdown}>
          <button 
            className={styles.toolbarButton}
            onClick={() => setShowSizeMenu(!showSizeMenu)}
          >
            Aa <span className={styles.dropdownArrow}>▼</span>
          </button>
          {showSizeMenu && (
            <div className={styles.dropdownMenu}>
              <button 
                className={styles.dropdownItem} 
                onClick={() => changeTextSize('small')}
              >
                Small
              </button>
              <button 
                className={styles.dropdownItem} 
                onClick={() => changeTextSize('normal')}
              >
                Normal
              </button>
              <button 
                className={styles.dropdownItem} 
                onClick={() => changeTextSize('large')}
              >
                Large
              </button>
              <button 
                className={styles.dropdownItem} 
                onClick={() => changeTextSize('extraLarge')}
              >
                Extra Large
              </button>
            </div>
          )}
        </div>
        
        <span className={styles.divider}></span>
        
        <button 
          className={styles.toolbarButton}
          onClick={() => addHeading(1)}
          title="Heading 1"
        >
          H1
        </button>
        <button 
          className={styles.toolbarButton}
          onClick={() => addHeading(2)}
          title="Heading 2"
        >
          H2
        </button>
        <button 
          className={styles.toolbarButton}
          onClick={() => addHeading(3)}
          title="Heading 3"
        >
          H3
        </button>
        
        <span className={styles.divider}></span>
        
        <button 
          className={styles.toolbarButton}
          onClick={addBulletList}
          title="Bullet List"
        >
          •
        </button>
        <button 
          className={styles.toolbarButton}
          onClick={addTaskItem}
          title="Task List"
        >
          ☑
        </button>
      </div>
      
      <div
        ref={editorRef}
        className={styles.content}
        contentEditable
        onInput={handleContentChange}
        onBlur={handleContentChange}
        onKeyDown={handleKeyDown}
        data-placeholder="Type here..."
        spellCheck={false}
      />
    </div>
  );
};

export default SimpleRichTextEditor;