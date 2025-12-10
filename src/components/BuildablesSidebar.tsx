import React, { useState } from 'react';
import { DataService } from '@services/DataService';
import { BuildableItem } from '@models/BuildableItem';

interface BuildablesSidebarProps {
  dataService: DataService;
  onSelectItem: (item: BuildableItem) => void;
  selectedBuildable: BuildableItem | null;
}

export const BuildablesSidebar: React.FC<BuildablesSidebarProps> = ({
  dataService,
  onSelectItem,
  selectedBuildable,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  const filteredItems = dataService.filterBuildableItems(searchTerm, category);

  return (
    <aside className="sidebar">
      <h2>Buildable Items</h2>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="category-filter">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="storage">Storage</option>
          <option value="crafting">Crafting</option>
          <option value="agriculture">Agriculture</option>
          <option value="housing">Housing</option>
          <option value="defense">Defense</option>
          <option value="decoration">Decoration</option>
          <option value="furniture">Furniture</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="item-list">
        {filteredItems.map((item, index) => {
          const isSelected = selectedBuildable && selectedBuildable.name === item.name;
          return (
          <div
            key={index}
            className={`item ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              onSelectItem(item);
            }}
          >
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="item-icon"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <div className="item-details">
              <div className="item-name">{item.name}</div>
              <div className="item-category">{item.category}</div>
              <div className="item-size">
                Size: {item.width}x{item.height}
              </div>
            </div>
          </div>
        )})}
      </div>
    </aside>
  );
};
