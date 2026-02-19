"""
Canvas Preview Widget - Minimap showing the full topology canvas
"""
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PyQt6.QtCore import Qt, QRectF
from PyQt6.QtGui import QPainter, QPen, QColor, QBrush
from typing import Optional


class CanvasPreview(QWidget):
    """Minimap widget showing overview of the topology canvas"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.canvas = None
        self.setMinimumSize(200, 150)
        self.setMaximumSize(250, 200)
        
        # Configure preview as floating overlay
        self.setStyleSheet("""
            CanvasPreview {
                background-color: rgba(44, 44, 44, 230);
                border: 2px solid #3498db;
                border-radius: 8px;
            }
        """)
        
        # Make it stay on top
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, False)
        self.setWindowFlags(Qt.WindowType.Widget)
        
        # Layout
        layout = QVBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        layout.setSpacing(2)
        
        # Title
        title = QLabel("Canvas Preview")
        title.setStyleSheet("color: #ecf0f1; font-weight: bold; font-size: 11px; border: none; background: transparent;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # Stretch to allow space for painting
        layout.addStretch()
    
    def set_canvas(self, canvas):
        """Set the canvas to preview"""
        self.canvas = canvas
        # Connect to canvas updates
        if hasattr(canvas, 'topology_changed'):
            canvas.topology_changed.connect(self.update)
        self.update()
    
    def paintEvent(self, a0):
        """Custom paint event to draw minimap"""
        super().paintEvent(a0)
        
        if not self.canvas:
            return
        
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Get canvas scene rect
        scene = self.canvas.scene()
        scene_rect = scene.sceneRect()
        
        # Calculate preview area (leave space for title)
        preview_rect = self.rect().adjusted(10, 30, -10, -10)
        
        # Calculate scale factor
        scale_x = preview_rect.width() / scene_rect.width()
        scale_y = preview_rect.height() / scene_rect.height()
        scale = min(scale_x, scale_y)
        
        # Center the preview
        scaled_width = scene_rect.width() * scale
        scaled_height = scene_rect.height() * scale
        offset_x = preview_rect.x() + (preview_rect.width() - scaled_width) / 2
        offset_y = preview_rect.y() + (preview_rect.height() - scaled_height) / 2
        
        # Draw background
        painter.fillRect(
            int(offset_x), int(offset_y),
            int(scaled_width), int(scaled_height),
            QColor("#F5F5F5")
        )
        
        # Draw viewport rectangle (what's visible in the main canvas)
        viewport_rect = self.canvas.mapToScene(self.canvas.viewport().rect()).boundingRect()
        viewport_scaled = QRectF(
            offset_x + (viewport_rect.x() - scene_rect.x()) * scale,
            offset_y + (viewport_rect.y() - scene_rect.y()) * scale,
            viewport_rect.width() * scale,
            viewport_rect.height() * scale
        )
        painter.setPen(QPen(QColor("#3498db"), 2))
        painter.setBrush(QBrush(QColor(52, 152, 219, 30)))  # Semi-transparent blue
        painter.drawRect(viewport_scaled)
        
        # Draw nodes
        for node_item in self.canvas.node_items.values():
            node_pos = node_item.pos()
            x = offset_x + (node_pos.x() - scene_rect.x()) * scale
            y = offset_y + (node_pos.y() - scene_rect.y()) * scale
            
            # Draw small rectangle for each node
            painter.setPen(QPen(Qt.GlobalColor.black, 1))
            painter.setBrush(QBrush(node_item.color))
            painter.drawRect(int(x - 3), int(y - 3), 6, 6)
        
        # Draw links
        painter.setPen(QPen(Qt.GlobalColor.darkGray, 1))
        for link_item in self.canvas.link_items:
            source_pos = link_item.source_item.pos()
            target_pos = link_item.target_item.pos()
            
            x1 = offset_x + (source_pos.x() - scene_rect.x()) * scale
            y1 = offset_y + (source_pos.y() - scene_rect.y()) * scale
            x2 = offset_x + (target_pos.x() - scene_rect.x()) * scale
            y2 = offset_y + (target_pos.y() - scene_rect.y()) * scale
            
            painter.drawLine(int(x1), int(y1), int(x2), int(y2))
