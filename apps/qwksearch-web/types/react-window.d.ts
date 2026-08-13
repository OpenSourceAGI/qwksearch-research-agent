// Type augmentation to support react-window v1 FixedSizeList API
// The Tree component uses react-window v1 API (FixedSizeList)
declare module "react-window" {
  import * as React from "react";

  export interface ListChildComponentProps<T = any> {
    index: number;
    style: React.CSSProperties;
    data: T;
    isScrolling?: boolean;
  }

  export interface FixedSizeListProps<T = any> {
    children: React.ComponentType<ListChildComponentProps<T>>;
    className?: string;
    height: number | string;
    itemCount: number;
    itemSize: number;
    layout?: "horizontal" | "vertical";
    onItemsRendered?: (props: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => void;
    onScroll?: (props: {
      scrollDirection: "forward" | "backward";
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => void;
    outerElementType?: React.ElementType;
    outerRef?: React.Ref<any>;
    innerElementType?: React.ElementType;
    innerRef?: React.Ref<any>;
    overscanCount?: number;
    style?: React.CSSProperties;
    useIsScrolling?: boolean;
    width: number | string;
    itemKey?: (index: number, data: T) => string | number;
    itemData?: T;
    direction?: "ltr" | "rtl";
    initialScrollOffset?: number;
  }

  export class FixedSizeList<T = any> extends React.Component<FixedSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: "auto" | "smart" | "center" | "end" | "start"): void;
  }
}
