import React, { useState, useEffect } from 'react';
import styles from './TabManager.module.css';

interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultActive?: boolean;
}

interface TabManagerProps {
  tabs: Tab[];
}

export function TabManager({ tabs }: TabManagerProps) {
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const defaultTab = tabs.find(tab => tab.defaultActive);
    return defaultTab ? defaultTab.id : tabs[0]?.id || '';
  });

  // Ensure activeTabId is valid if tabs change
  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTabId) && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    } else if (tabs.length === 0 && activeTabId !== '') {
      setActiveTabId('');
    }
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  return (
    <div className={styles.tabManager}>
      <div className={styles.tabHeaders}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabHeader} ${activeTabId === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {activeTab ? activeTab.content : null}
      </div>
    </div>
  );
}
