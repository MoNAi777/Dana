import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';

const FileList = ({ files, onRemoveFile }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') {
      return '📄 PDF';
    } else if (
      fileType === 'application/msword' || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return '📝 Word';
    } else {
      return '📄 File';
    }
  };
  
  if (files.length === 0) {
    return <p>אין קבצים בתור. גרור או בחר קבצים כדי להתחיל.</p>;
  }
  
  return (
    <div>
      <h3>הקבצים שלך ({files.length})</h3>
      <p>גרור ושחרר כדי לשנות את הסדר:</p>
      
      <Droppable droppableId="file-list">
        {(provided) => (
          <ul
            className="file-list"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {files.map((file, index) => (
              <Draggable key={file.id} draggableId={file.id} index={index}>
                {(provided, snapshot) => (
                  <li
                    className={`file-item ${snapshot.isDragging ? 'file-item-dragging' : ''}`}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <div>
                      <span className="file-icon">{getFileIcon(file.type)}</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onRemoveFile(file.id)}
                    >
                      הסר
                    </button>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </div>
  );
};

export default FileList; 