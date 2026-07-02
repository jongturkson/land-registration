import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { appendLog } from '../../services/ledger.service';
import { TransferTitleSchema } from '../../shared/schemas/title.schema';

class MutationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// POST /titles/:title_no/transfer — total alienation (mutation totale).
// The current owner is deactivated, the new owner is recorded, and the event
// is appended to the hash-chained Livre Foncier ledger — all atomically.
export async function transferTitle(req: Request, res: Response): Promise<void> {
  const title_no = req.params['title_no'] as string;

  const parse = TransferTitleSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ message: 'Invalid request', errors: parse.error.issues });
    return;
  }
  const { new_owner, deed_reference, notes } = parse.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const title = await tx.title.findUnique({
        where: { title_no },
        include: { owners: { where: { is_current: true } } },
      });

      if (!title) {
        throw new MutationError(404, 'Title not found');
      }
      if (title.status !== 'VALID') {
        throw new MutationError(409, 'Only VALID titles can be transferred');
      }

      const previousOwners = title.owners.map((o) => o.full_name);

      await tx.titleOwner.updateMany({
        where: { title_id: title.id, is_current: true },
        data: { is_current: false },
      });

      const owner = await tx.titleOwner.create({
        data: {
          title_id: title.id,
          full_name: new_owner.full_name,
          is_current: true,
          ...(new_owner.ancestors ? { ancestors: new_owner.ancestors } : {}),
          ...(new_owner.birth_place ? { birth_place: new_owner.birth_place } : {}),
          ...(new_owner.birth_date ? { birth_date: new Date(new_owner.birth_date) } : {}),
        },
      });

      await appendLog(
        req.user!.id,
        req.user!.role,
        'TOTAL_ALIENATION',
        'TITLE',
        title.id,
        {
          title_no: title.title_no,
          previous_owners: previousOwners,
          new_owner: owner.full_name,
          deed_reference: deed_reference ?? null,
          notes: notes ?? null,
        },
        tx,
      );

      return { title, owner };
    });

    res.status(201).json({
      message: 'Title transferred successfully (total alienation recorded)',
      title_no: result.title.title_no,
      new_owner: result.owner,
    });
  } catch (err) {
    if (err instanceof MutationError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    throw err;
  }
}
