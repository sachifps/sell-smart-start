
import * as React from "react";
import { toast as sonnerToast } from "sonner";

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
      id: string;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      id: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      id: string;
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toasts } = state;
      return {
        ...state,
        toasts: toasts.map((t) =>
          t.id === action.id ? { ...t } : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };

    default:
      return state;
  }
};

export const toast = {
  ...sonnerToast,
  error: (message: string) => {
    sonnerToast.error(message);
  },
  success: (message: string) => {
    sonnerToast.success(message);
  },
};

const useToast = () => {
  const [state, dispatch] = React.useReducer(reducer, {
    toasts: [],
  });

  React.useEffect(() => {
    return () => {
      toastTimeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
      toastTimeouts.clear();
    };
  }, []);

  const toast = (props: ToasterToast) => {
    const id = props.id || genId();
    const update = (props: ToasterToast) => {
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { ...props },
        id,
      });
    };

    const dismiss = () => {
      dispatch({ type: actionTypes.DISMISS_TOAST, id });
    };

    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: {
        ...props,
        id,
      },
    });

    return {
      id,
      dismiss,
      update,
    };
  };

  return {
    ...state,
    toast,
    dismiss: (id: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, id });
    },
  };
};

export { useToast };

