## Issues with IRLS

* Local minima: IRLS struggles to find the maximal set of satisfiable constraints, particularly when you work in one dimension
* Basically if we are in 1D, it will only find one constraint to satisfy?
    * Is there a degrees-of-freedom argument here?
    * I.e. interpreting constraints as system of equations, can only satisfy as many number of variables as you have (i.e. independent constraints w/o dependence)
    * So for scaffold sketch the lines $l$ were parameterized $l=(l_a, l_b)=(x_a, y_a, z_a, x_b, y_b, z_b)$ so up to six unique constraints can be satisfied.
    * *Or rather* IRLS' solving can find up to six satisfiable constraints...

Problem! Problem!

Our assets are only defined in terms of $(x, y, t)$ or three parameters. This is not good (especially since (x, y) constraints are separate and will weight equally with the (t) constraints).

So what can we do then? Brainstorming: 
* Find a relaxation ???
* Define constraints that can never be satisfied $\rightarrow$ turns into a problem of violate the constraints least badly (non-convex again... maybe...)
* Idk...
* 1D search through all time can definitely find the optimal solution but that's not IRLS anymore. 

Okay these aren't great answers. What's the real reason for IRLS failing to work? Common words like "apple" and "make" in a pie baking recipe appear everywhere and, when we constrain on every single word, the bigram/trigram model chooses the closest word to satisfy (weight -> infinity).

Can we adjust the behavior of IRLS so that this doesn't happen? 

Get rid of non-important words