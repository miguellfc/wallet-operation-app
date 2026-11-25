import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

import { Reveal } from '@/components/ui/reveal';

type Item = { key: string; node: ReactNode };

function flatten(children: ReactNode, prefix = ''): Item[] {
  return Children.toArray(children).flatMap((child, index) => {
    const key = `${prefix}${isValidElement(child) && child.key !== null ? child.key : index}`;
    if (isValidElement(child) && child.type === Fragment) {
      return flatten((child as ReactElement<{ children?: ReactNode }>).props.children, `${key}/`);
    }
    return [{ key, node: child }];
  });
}

export function Stagger({ children }: { children: ReactNode }) {
  return flatten(children).map((item, index) => (
    <Reveal key={item.key} index={index}>
      {item.node}
    </Reveal>
  ));
}
