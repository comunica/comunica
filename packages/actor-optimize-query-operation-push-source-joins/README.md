# Comunica Push Source Joins Optimize Query Operation Actor

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that rewrites `Join(A@S, Union(B@S, B@T, ...))` into `Union(Join(A, B)@S, Join(A@S, Union(B@T, ...)))`,
so that a source evaluates its own part of a join with an operation over multiple sources in one request.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).
